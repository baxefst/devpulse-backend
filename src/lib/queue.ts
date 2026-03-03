type Job = () => Promise<void>

class SimpleQueue {
  private queue: Job[] = []
  private running = false

  push(job: Job) {
    this.queue.push(job)
    if (!this.running) this.drain()
  }

  private async drain() {
    this.running = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      try { await job() } catch (e) { console.error('[queue] job failed', e) }
    }
    this.running = false
  }
}

export const reputationQueue = new SimpleQueue()