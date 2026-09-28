import { getHint } from "./AIInstructor";

export class HintManager {
  constructor() {
    this.level = 0;
  }

  reset() {
    this.level = 0;
  }

  nextHint(fault) {
    this.level = Math.min(this.level + 1, 3);
    return getHint(fault, this.level);
  }
}