<template>
  <div>
    <h1>用户中心</h1>
    <div id="drag"
         ref="drag">把文件拖拽到这里上传</div>
    <input type="file"
           name="file"
           @change="handleFileChange">
    <h2>文件上传进度</h2>
    <el-progress :stroke-width="20"
                 :percentage="uploadProgress"></el-progress>
    <el-button @click="uploadFile">上传</el-button>
    <h2>hash 计算进度-webworker</h2>
    <el-progress :stroke-width="20"
                 :percentage="hashProgress"></el-progress>
    <h2>hash 计算进度-时间切片</h2>
    <el-progress :stroke-width="20"
                 :percentage="idleProgress"></el-progress>
  </div>
</template>
<script>
  import sparkMD5 from 'spark-md5'
  const CHUNK_SIZE = 1 * 1024 * 1024
  export default {
    data () {
      return {
        file: null,
        uploadProgress: 10,
        worker: null,
        hashProgress: 0,
        idleProgress: 0,
        chunks: [],
        hash: null
      }
    },
    mounted () {
      this.getUserDetail()
      this.bindEvents()
    },
    methods: {
      bindEvents () {
        const drag = this.$refs.drag
        drag.addEventListener('dragover', (e) => {
          drag.style.borderColor = 'red'
          e.preventDefault()
        })
        drag.addEventListener('dragleave', (e) => {
          drag.style.borderColor = 'blueviolet'
          e.preventDefault()
        })
        drag.addEventListener('drop', (e) => {
          e.preventDefault()
          drag.style.borderColor = 'blueviolet'
          const fileList = e.dataTransfer.files
          this.file = fileList[0]
          console.log('e')
        })
      },
      createFileChunks (file, size = CHUNK_SIZE) {
        const chunks = []
        let cur = 0
        while (cur < file.size) {
          chunks.push({ index: cur, file: file.slice(cur, cur + size) })
          cur += size
        }
        return chunks
      },
      calculateHashWorker (chunks) {
        return new Promise(resolve => {
          this.worker = new Worker('/hash.js')
          this.worker.postMessage({ chunks })
          this.worker.onmessage = e => {
            const { progress, hash } = e.data
            this.hashProgress = progress
            if (hash) {
              resolve(hash)
            }
          }
        })
      },
      // 借鉴fiber架构,时间切片
      calculateHashIdle (chunks) {
        let count = 0
        const spark = new sparkMD5.ArrayBuffer()
        const appendToSpark = function (file) {
          return new Promise(resolve => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(file)
            reader.onload = e => {
              spark.append(reader.result)
              resolve()
            }
          })
        }
        return new Promise(resolve => {
          const workLoop = async deadLine => {
            while (count < chunks.length && deadLine.timeRemaining() > 1) {
              // 空闲时间处理任务
              await appendToSpark(chunks[count].file)
              count++
              if (count < chunks.length) {
                this.idleProgress = Number(
                  (count / chunks.length * 100).toFixed(2)
                )
              } else {
                this.idleProgress = 100
                resolve(spark.end())
              }
            }
            window.requestIdleCallback(workLoop)
          }
          window.requestIdleCallback(workLoop)
        })
      },
      async uploadFile () {
        // if(await this.isImage(this.file)) {
        //   console.log('是图片')
        // } else {
        //   console.log('不是图片')
        // }
        const chunks = this.createFileChunks(this.file)
        const hash = await this.calculateHashWorker(chunks) // webworker计算hash
        this.hash = hash
        // 问一下后端,文件是否上传过,是否有存在的hash
        const { data: { uploaded, uploadedList } } = await this.$http.post('/checkfile', {
          hash: hash,
          ext: this.file.name.split('.').pop()
        })
        if (uploaded) {
          // 秒传
          return this.$message({
            type: 'success',
            message: '上传成功'
          })
        }
        // const hash1 = await this.calculateHashIdle(chunks) // 时间切片计算hash
        // console.log('hash1', hash1)
        // TODO: 抽样hash,不算全量, 布隆过滤器
        this.chunks = chunks.map((chunk, index) => {
          // 切片的名字 hash+index
          const name = hash + '-' + index
          return {
            name,
            hash,
            index,
            chunk: chunk.file
          }
        }).filter(chunk => !uploadedList.includes(chunk.name))
        await this.uploadChunks()
      },
      async uploadChunks () {
        const requests = this.chunks.map((chunk, index) => {
          const form = new FormData()
          form.append('name', chunk.name)
          form.append('hash', chunk.hash)
          form.append('chunk', chunk.chunk)
          form.append('index', chunk.index)
          return this.$http.post('/uploadfile', form, {
            onUploadProgress: (progress) => {
              this.chunks[index].progress = Number((progress.loaded / progress.total * 100).toFixed(2))
            }
          })
        })
        // TODO: 并发量控制
        await Promise.all(requests)
        await this.mergeRequest()
      },
      mergeRequest () {
        this.$http.post('/merge', {
          ext: this.file.name.split('.').pop(), // 文件后缀名
          size: CHUNK_SIZE,
          hash: this.hash
        })
      },
      async getUserDetail () {
        const res = await this.$http.get('/user/info')
        console.log('res', res)
      },
      blobToString (blob) {
        return new Promise((reslove) => {
          const reader = new FileReader()
          reader.onload = () => {
            console.log('reader', reader.result) //  将 GIF89a 转为 '47 49 46 38 39 61'
            const res = reader.result.split('')
              .map(v => v.charCodeAt())
              .map(v => v.toString(16).toUpperCase())
              .map(v => v.padStart(2, '0'))
              .join(' ')
            // 转成16进制的格式
            reslove(res)
          }
          reader.readAsBinaryString(blob)
        })
      },
      async isGif (file) {
        // GIF89a GIF87a
        // 前面6个16进制 '47 49 46 38 39 61' 或 '47 49 46 38 37 61'
        const res = await this.blobToString(file.slice(0, 6))
        console.log('gifres', res)
        const isGif = res === '47 49 46 38 39 61' || res === '47 49 46 38 37 61'
        return isGif
      },
      async isPng (file) {
        // 前面8个16进制 '89 50 4E 47 0D 0A 1A 0A'
        const res = await this.blobToString(file.slice(0, 8))
        console.log('png res', res)
        const isPng = res === '89 50 4E 47 0D 0A 1A 0A'
        return isPng
      },
      async isJpg (file) {
        // 前面2个16进制 'FF D8' 最后两位为 'FF D9'
        const len = file.size
        const start = await this.blobToString(file.slice(0, 2))
        const tail = await this.blobToString(file.slice(-2, len))
        console.log('Jpg res', start, tail)
        const isJpg = start === 'FF D8' && tail === 'FF D9'
        return isJpg
      },
      async isImage (file) {
        return await this.isGif(file) || await this.isPng(file)
      },
      handleFileChange (e) {
        console.log(7777)
        const [file] = e.target.files
        if (!file) return
        this.file = file
      },
    }
  }
</script>
<style lang="scss" scoped>
  #drag {
    width: 800px;
    height: 200px;
    border: 1px dashed blueviolet;
  }
</style>
