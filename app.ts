// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent, eventHolder?: IEvent[]): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent, eventHolder?: IEvent[]): void;
  subscribe(type: string, handler: ISubscriber): void;
  unsubscribe(type: string, handler: ISubscriber): void;
}

enum EVENT_TYPE {
  SALE = "sale",
  REFIL = "refil",
  LOW_STOCK_WARNING = "low_stock_warning",
  STOCK_LEVEL_OK = "stock_level_ok",
}

const LOW_STOCK_WARNING_THRESHOLD = 3;
const IS_DEBUG_LOG = true;

// implementations
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): string {
    return EVENT_TYPE.SALE;
  }
}

class MachineRefillEvent implements IEvent {

  constructor(private readonly _refill: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  refillAmount(): number {
    return this._refill;
  }

  type(): string {
    return EVENT_TYPE.REFIL;
  }
}

class LowStockWarningEvent implements IEvent {
  constructor(private readonly _stockRemain: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  stockRemain(): number {
    return this._stockRemain;
  }

  type(): string {
    return EVENT_TYPE.LOW_STOCK_WARNING;
  }
}

class StockLevelOkEvent implements IEvent {
  constructor(private readonly _stockRemain: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  stockRemain(): number {
    return this._stockRemain;
  }

  type(): string {
    return EVENT_TYPE.STOCK_LEVEL_OK;
  }
}

class PublishSubscribeService implements IPublishSubscribeService {
  private eventSubscribe: { [key: string]: ISubscriber[] };

  constructor() {
    this.eventSubscribe = {};
  }

  publish(event: IEvent, eventHolder: IEvent[]): void {
    const subscribers = this.eventSubscribe[event.type()];
    if (!subscribers) return console.log("No subscriber");
    subscribers.forEach(subscriber => subscriber.handle(event, eventHolder));
  };

  subscribe(type: string, handler: ISubscriber): void {
    if (this.eventSubscribe[type]) {
      this.eventSubscribe[type].push(handler);
    } else {
      this.eventSubscribe[type] = [handler];
    }
  };

  unsubscribe(type: string, handler: ISubscriber): void {
    const subscribers = this.eventSubscribe[type];
    if (!subscribers) return console.log("Subscribe not found.");
    this.eventSubscribe[type] = subscribers.filter(subscribedHandler => subscribedHandler != handler);
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineSaleEvent, eventHolder?: IEvent[]): void {
    const targetMachine = this.getMachineById(event.machineId());
    IS_DEBUG_LOG && console.log(`[MachineSaleSubscriber] Event receive`, event);

    if (!targetMachine) {
      console.error("Unknown machine event occurs");
      return;
    }
    const stockLevelBeforeEvent = targetMachine.stockLevel;
    targetMachine.stockLevel -= event.getSoldQuantity();
    if (stockLevelBeforeEvent >= LOW_STOCK_WARNING_THRESHOLD
      && targetMachine.stockLevel < LOW_STOCK_WARNING_THRESHOLD) {
      const lowStockWarningEvent = new LowStockWarningEvent(targetMachine.stockLevel, targetMachine.id);
      eventHolder?.push(lowStockWarningEvent);
    }
  }

  private getMachineById(machineId: string): Machine | undefined {
    return this.machines.find(machine => machine.id == machineId)
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineRefillEvent, eventHolder?: IEvent[]): void {
    const targetMachine = this.getMachineById(event.machineId());
    IS_DEBUG_LOG && console.log(`[MachineRefillSubscriber] Event receive`, event);

    if (!targetMachine) {
      console.error("Unknown machine event occurs");
      return;
    }
    const stockLevelBeforeEvent = targetMachine.stockLevel;
    targetMachine.stockLevel += event.refillAmount();
    if (stockLevelBeforeEvent < LOW_STOCK_WARNING_THRESHOLD
      && targetMachine.stockLevel >= LOW_STOCK_WARNING_THRESHOLD) {
      const stockLevelOkEvent = new StockLevelOkEvent(targetMachine.stockLevel, targetMachine.id);
      eventHolder?.push(stockLevelOkEvent);
    }
  }

  private getMachineById(machineId: string): Machine | undefined {
    return this.machines.find(machine => machine.id == machineId)
  }
}

class StockWarningSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: LowStockWarningEvent, eventHolder?: IEvent[]): void {
    IS_DEBUG_LOG && console.log(`[StockWarningSubscriber] Event receive`, event);
  }
}

class StockLevelOkSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: StockLevelOkEvent, eventHolder?: IEvent[]): void {
    IS_DEBUG_LOG && console.log(`[StockLevelOkSubscriber] Event receive`, event);
  }
}


// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  constructor(id: string) {
    this.id = id;
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}


// program
(async () => {
  IS_DEBUG_LOG && console.log(`[Main] Test Begin`);
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);
  // create a machine refill event subscriber.
  const refillSubscriber = new MachineRefillSubscriber(machines);
  // create a stock warning event subscriber.
  const stockWarningSubscriber = new StockWarningSubscriber(machines);
  // create a stock level ok event subscriber.
  const stockLevelOkSubscriber = new StockLevelOkSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new PublishSubscribeService(); // implement and fix this

  // reigster saleSubscriber with event "sale"
  pubSubService.subscribe(EVENT_TYPE.SALE, saleSubscriber);
  // reigster refillSubscriber with event "refill"
  pubSubService.subscribe(EVENT_TYPE.REFIL, refillSubscriber);
  // reigster stockWarningSubscriber with event "low_stock_warning"
  pubSubService.subscribe(EVENT_TYPE.LOW_STOCK_WARNING, stockWarningSubscriber);
  // reigster stockLevelOkSubscriber with event "stock_level_ok"
  pubSubService.subscribe(EVENT_TYPE.STOCK_LEVEL_OK, stockLevelOkSubscriber);

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map(i => eventGenerator());

  do {
    const event = events.shift();
    if (!event) break;
    // publish the events
    pubSubService.publish(event, events);
  } while (events.length > 0)

  IS_DEBUG_LOG && console.log(`[Main] Machine Status after every event`, machines);

  // unsubscribe the saleSubscribe handler from event "sale"
  pubSubService.unsubscribe(EVENT_TYPE.SALE, saleSubscriber);
  IS_DEBUG_LOG && console.log(`[Main] Test End.`);
})();
