import { AsyncLocalStorage } from "node:async_hooks";
import { ScaffoldInterruptedError, type ScaffoldSignalName } from "./errors.js";

const scaffoldSignals = ["SIGINT", "SIGTERM"] as const satisfies readonly ScaffoldSignalName[];

export interface ScaffoldInterruptContext {
  readonly interruptedSignal: ScaffoldSignalName | undefined;
  readonly committed: boolean;
  markCommitted(): void;
  isInterrupted(): boolean;
  throwIfInterrupted(): void;
}

class ActiveScaffoldInterruptContext implements ScaffoldInterruptContext {
  #interruptedSignal: ScaffoldSignalName | undefined;
  committed = false;

  markCommitted(): void {
    this.committed = true;
  }

  get interruptedSignal(): ScaffoldSignalName | undefined {
    return this.#interruptedSignal;
  }

  interrupt(signal: ScaffoldSignalName): void {
    this.#interruptedSignal ??= signal;
  }

  isInterrupted(): boolean {
    return this.#interruptedSignal !== undefined;
  }

  throwIfInterrupted(): void {
    if (this.#interruptedSignal !== undefined) {
      throw new ScaffoldInterruptedError(this.#interruptedSignal, this.committed);
    }
  }
}

const interruptStorage = new AsyncLocalStorage<ActiveScaffoldInterruptContext>();
const activeContexts = new Set<ActiveScaffoldInterruptContext>();
const signalHandlers = new Map<ScaffoldSignalName, () => void>();

export function getScaffoldInterruptContext(): ScaffoldInterruptContext | undefined {
  return interruptStorage.getStore();
}

export async function withScaffoldSignalHandling<T>(task: () => Promise<T>): Promise<T> {
  if (interruptStorage.getStore() !== undefined) {
    return task();
  }

  const context = new ActiveScaffoldInterruptContext();
  activeContexts.add(context);
  installSignalHandlers();
  try {
    const result = await interruptStorage.run(context, task);
    context.throwIfInterrupted();
    return result;
  } finally {
    activeContexts.delete(context);
    removeSignalHandlersWhenIdle();
  }
}

function installSignalHandlers(): void {
  if (signalHandlers.size > 0) {
    return;
  }
  for (const signal of scaffoldSignals) {
    const handler = (): void => {
      for (const context of activeContexts) {
        context.interrupt(signal);
      }
    };
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }
}

function removeSignalHandlersWhenIdle(): void {
  if (activeContexts.size > 0) {
    return;
  }
  for (const [signal, handler] of signalHandlers) {
    process.removeListener(signal, handler);
  }
  signalHandlers.clear();
}
