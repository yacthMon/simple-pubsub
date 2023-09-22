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
  constructor(private readonly _machineRepository: MachineRepository) { }

  handle(event: MachineSaleEvent, eventHolder?: IEvent[]): void {
    const machineId = event.machineId()
    IS_DEBUG_LOG && console.log(`[MachineSaleSubscriber] Event receive`, event);

    if (!this._machineRepository.isMachineExist(machineId)) return console.error("No machine found for the event");

    const preStockLevel = this._machineRepository.getStockRemain(machineId);
    this._machineRepository.reduceStock(machineId, event.getSoldQuantity());
    const postStockLevel = this._machineRepository.getStockRemain(machineId);
    if (preStockLevel >= LOW_STOCK_WARNING_THRESHOLD
      && postStockLevel < LOW_STOCK_WARNING_THRESHOLD) {
      const lowStockWarningEvent = new LowStockWarningEvent(postStockLevel, machineId);
      eventHolder?.push(lowStockWarningEvent);
    }
  }
}

class MachineRefillSubscriber implements ISubscriber {
  constructor(private readonly _machineRepository: MachineRepository) { }

  handle(event: MachineRefillEvent, eventHolder?: IEvent[]): void {
    const machineId = event.machineId()
    IS_DEBUG_LOG && console.log(`[MachineRefillSubscriber] Event receive`, event);

    if (!this._machineRepository.isMachineExist(machineId)) return console.error("No machine found for the event");

    const preStockLevel = this._machineRepository.getStockRemain(machineId);
    this._machineRepository.refillStock(machineId, event.refillAmount());
    const postStockLevel = this._machineRepository.getStockRemain(machineId);
    if (preStockLevel < LOW_STOCK_WARNING_THRESHOLD
      && postStockLevel >= LOW_STOCK_WARNING_THRESHOLD) {
      const stockLevelOkEvent = new StockLevelOkEvent(postStockLevel, machineId);
      eventHolder?.push(stockLevelOkEvent);
    }
  }
}

class StockWarningSubscriber implements ISubscriber {
  constructor(private readonly _machineRepository: MachineRepository) { }

  handle(event: LowStockWarningEvent, eventHolder?: IEvent[]): void {
    IS_DEBUG_LOG && console.log(`[StockWarningSubscriber] Event receive`, event);
  }
}

class StockLevelOkSubscriber implements ISubscriber {
  constructor(private readonly _machineRepository: MachineRepository) { }

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

class MachineRepository {

  constructor(private _machines: Machine[]) { }

  public getMachineById(machineId: string): Machine | undefined {
    return this._machines.find(machine => machine.id == machineId)
  }

  public isMachineExist(machineId: string): boolean {
    return this._machines.findIndex(machine => machine.id == machineId) > -1
  }

  public getStockRemain(machineId: string): number {
    const machine = this.getMachineById(machineId);
    if (!machine) throw new Error(`Machine ID [${machineId}] does not exist.`);
    return machine.stockLevel;
  }

  public reduceStock(machineId: string, total: number): void {
    const machine = this.getMachineById(machineId);
    if (!machine) throw new Error(`Machine ID [${machineId}] does not exist.`);
    machine.stockLevel -= total;
  }

  public refillStock(machineId: string, total: number): void {
    const machine = this.getMachineById(machineId);
    if (!machine) throw new Error(`Machine ID [${machineId}] does not exist.`);
    machine.stockLevel += total;
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
  const machineRepository = new MachineRepository(machines);

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machineRepository);
  // create a machine refill event subscriber.
  const refillSubscriber = new MachineRefillSubscriber(machineRepository);
  // create a stock warning event subscriber.
  const stockWarningSubscriber = new StockWarningSubscriber(machineRepository);
  // create a stock level ok event subscriber.
  const stockLevelOkSubscriber = new StockLevelOkSubscriber(machineRepository);

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
  const events = [];


  // TESTING For Stock level warning and Stock level ok event.
  // Add Sold event for machine 001 to met the Low Stock Warning threshold.
  events.push(new MachineSaleEvent(8, "001"));
  // Add Sold event again, this one should not create more Low Stock Warning event.
  events.push(new MachineSaleEvent(1, "001"));
  // Add Sold event for machine 002 to met the Low Stock Warning threshold.
  events.push(new MachineSaleEvent(8, "002"));
  // Add Refill event for machine 002 to met the Stock Level OK condition
  events.push(new MachineRefillEvent(5, "002"));
  // Add Refill event again, this one should not create more Stock level ok event.
  events.push(new MachineRefillEvent(2, "002"));
  // There should be 2 Stock Warning Event and 1 Stock Level OK Event

  // Original Generate random event
  // events.push(...[1, 2, 3, 4, 5].map(i => eventGenerator()));

  do {
    const event = events.shift();
    if (!event) break;
    // publish the events
    pubSubService.publish(event, events);
  } while (events.length > 0)

  IS_DEBUG_LOG && console.log(`[Main] Machine Status after every event`, machines);

  // unsubscribe the saleSubscribe handler from event "sale"
  IS_DEBUG_LOG && console.log(`[Main] Unsubscribe saleSubscriber for Sale Event.`);
  pubSubService.unsubscribe(EVENT_TYPE.SALE, saleSubscriber);
  IS_DEBUG_LOG && console.log(`[Main] PubSub Service.`, pubSubService);
  pubSubService.subscribe(EVENT_TYPE.SALE, saleSubscriber);
  // Register RefillSubscriber for "sale" event, this is to test that unsubscribe work with correct event and handler
  pubSubService.subscribe(EVENT_TYPE.SALE, refillSubscriber);
  IS_DEBUG_LOG && console.log(`[Main] Subscribe again with additional subscriber on Sale Event.`);
  IS_DEBUG_LOG && console.log(`[Main] PubSub Service.`, pubSubService);
  pubSubService.unsubscribe(EVENT_TYPE.SALE, saleSubscriber);
  IS_DEBUG_LOG && console.log(`[Main] Unsubscribe saleSubscriber for Sale Event.`);
  // At this point it should be RefillSubscriber subscribe for "sale" event
  IS_DEBUG_LOG && console.log(`[Main] PubSub Service.`, pubSubService);

  IS_DEBUG_LOG && console.log(`[Main] Test End.`);
})();
