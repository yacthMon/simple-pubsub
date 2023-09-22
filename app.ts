// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: string, handler: ISubscriber): void;
  // unsubscribe ( /* Question 2 - build this feature */ );
}

enum EVENT_TYPE {
  SALE = "sale",
  REFIL = "refil"
}


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

class PublishSubscribeService implements IPublishSubscribeService {
  private eventSubscribe: { [key: string]: ISubscriber[] };

  constructor() {
    this.eventSubscribe = {};
  }

  publish(event: IEvent): void {
    const subscribers = this.eventSubscribe[event.type()];
    if (!subscribers) return console.log("No subscriber");
    subscribers.every(subscriber => subscriber.handle(event));
  };

  subscribe(type: string, handler: ISubscriber): void {
    if (this.eventSubscribe[type]) {
      this.eventSubscribe[type].push(handler);
    } else {
      this.eventSubscribe[type] = [handler];
    }
  };
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineSaleEvent): void {
    this.machines[2].stockLevel -= event.getSoldQuantity();
  }
}

class MachineRefillSubscriber implements ISubscriber {
  handle(event: IEvent): void {
    throw new Error("Method not implemented.");
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
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new PublishSubscribeService(); // implement and fix this

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map(i => eventGenerator());

  // publish the events
  events.map(pubSubService.publish);
})();
