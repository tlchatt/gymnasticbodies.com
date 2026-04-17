// import { promises as fs } from 'fs';

class AsyncQueue {
  constructor() {
    // Start with a resolved promise
    this.queue = Promise.resolve();
  }

  /**
   * @param {Function} task - An async function that performs the file operation
   */
  add(task) {
    // Chain the new task to the previous one
    this.queue = this.queue.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error("Queue Task Error:", err);
      }
    });
    return this.queue;
  }
}

// Export a single instance to be shared across your app
export const writeQueue = new AsyncQueue();
