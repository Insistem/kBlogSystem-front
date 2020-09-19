import Vue from 'vue'
import axios from 'axios'
import { MessageBox } from 'element-ui'

const service = axios.create({
  // timeout: 5000,
  baseURL: '/api'
})


Vue.prototype.$http = service

export const http = service

// TODO: 这里为啥可以这么写, redirect 怎么来的
export default ({ store, redirect }) => {
  // 请求拦截
  service.interceptors.request.use(
    async config => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.common['Authorization'] = 'Bearer ' + token
      }
      return config
    }
  )

  // 响应拦截
  service.interceptors.response.use(
    async response => {
      let { data } = response

      if (data.code === -666) {
        MessageBox.confirm('登录已过期', '过期', {
          confirmButtonText: '登录',
          showCancelButton: false,
          type: 'warning'
        }).then(()=> {
          redirect({path: '/login'})
        })
      }
      return data
    }
  )
}
