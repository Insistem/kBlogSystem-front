import Vue from 'vue'
import axios from 'axios'

const service = axios.create({
  timeout: 5000,
  baseURL: '/api'
})

// 请求拦截

// 响应拦截

Vue.prototype.$http = service

export const http = service
