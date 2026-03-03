class SimpleQueue {
    queue = [];
    running = false;
    push(job) {
        this.queue.push(job);
        if (!this.running)
            this.drain();
    }
    async drain() {
        this.running = true;
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            try {
                await job();
            }
            catch (e) {
                console.error('[queue] job failed', e);
            }
        }
        this.running = false;
    }
}
export const reputationQueue = new SimpleQueue();
//# sourceMappingURL=queue.js.map