import { FaultType } from "./FaultType";

export class FaultManager {
  constructor() {
    this.currentFault = FaultType.NONE;
  }

  injectFault(fault) {
    this.currentFault = fault;
  }

  clearFault() {
    this.currentFault = FaultType.NONE;
  }

  getCurrentFault() {
    return this.currentFault;
  }
}