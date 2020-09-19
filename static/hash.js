
self.importScripts('spark-md5.min.js')

self.onmessage = e => {
  const { chunks } = e.data
  console.log('worker', e)
  const spark =  new self.SparkMD5.ArrayBuffer()

  let progress = 0
  let count = 0

  const loadNext = index => {
    const reader = new FileReader()
    reader.onload = e => {
      count ++
      spark.append(reader.result)
      if (count === chunks.length) {
        self.postMessage({
          progress: 100,
          hash: spark.end()
        })
      } else {
        progress = Number((count/chunks.length * 100).toFixed(2))
        console.log('proget', progress)
        self.postMessage({
          progress
        })
        loadNext(count)
      }
    }
    reader.readAsArrayBuffer(chunks[index].file)
  }
  loadNext(0)
}
