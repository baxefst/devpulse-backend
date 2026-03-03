export class SimpleQueue {
    queue = [];
    processing = false;
    async add(task) {
        this.queue.push(task);
        this.process();
    }
    async process() {
        if (this.processing || this.queue.length === 0)
            return;
        this.processing = true;
        const task = this.queue.shift();
        if (task) {
            try {
                await task();
            }
            catch (err) {
                console.error("Queue task failed:", err);
            }
        }
        this.processing = false;
        this.process();
    }
}
export const reputationQueue = new SimpleQueue();
//# sourceMappingURL=queue.js.map