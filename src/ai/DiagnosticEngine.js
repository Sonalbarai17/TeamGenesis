import { detectFault } from "../faults/FaultDetector";

export function diagnose(state) {
  const fault = detectFault(state);

  return {
    fault: fault,
    resolved: fault === "None",
  };
}