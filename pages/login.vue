<template>
  <div>
    <div class="login-container">
      <el-form class="login-form"
               :model="form"
               label-position="left"
               label-width="60px"
               :rules="rules"
               ref="loginForm">
        <div class="title-comtainer">
          <img src="/logo.png"
               alt="">
        </div>
        <el-form-item prop="email"
                      label="邮箱">
          <el-input v-model="form.email"
                    placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item prop="captcha"
                      label="验证码">
          <div class="captcha-container">
            <div class="img">
              <img :src="code.captcha"
              @click="updateCaptcha"
                   alt="">
            </div>
          </div>
          <el-input v-model="form.captcha"
                    placeholder="请输入验证码"></el-input>
        </el-form-item>
         <el-form-item prop="emailcode"
                      label="邮箱验证码">
          <div class="captcha-container">
           <el-button @click="sendEmailCode" :disabled="sendText!=='发送'" type="primary">{{sendText}}</el-button>
          </div>
          <el-input v-model="form.emailcode"
                    placeholder="请输入验证码"></el-input>
        </el-form-item>
        <el-form-item type="password" prop="password"
                      label="密码">
          <el-input v-model="form.password"
                    placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item label="">
          <el-button type="primary" @click.native.prevent="handleLogin">登录</el-button>
        </el-form-item>

      </el-form>
    </div>
  </div>
</template>
<script>
import md5 from 'md5'
  export default {
    layout: 'login',
    computed: {
      sendText() {
        const timer = this.send.timer
        if (timer <= 0) {
          return '发送'
        }
        return `${timer}s后重试`
      }
    },
    data () {
      return {
        send: {
          timer: 0
        },
        form: {
          email: 'mpy_yang@163.com',
          emailcode: '',
          nickname: '去大理',
          password: 'qwer1234',
          repeatpassword: 'qwer1234',
          captcha: '',
        },
        rules: {
          email: [
            { required: true, message: '请输入邮箱', trigger: 'blur' },
            { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }
          ],
          password: [
            // pattern: /^[\w|_|-|[a-z]]{6,12}&/g,
            { required: true,  message: '请输入密码', trigger: 'blur' },
          ]
        },
        code: {
          captcha: '/api/captcha'
        }
      }
    },
    methods: {
      async handleLogin () {
       let valid = await this.$refs.loginForm.validate()
       if (valid) {
         console.log('校验成功; ')
         const { email, password, captcha, emailcode } = this.form
         let obj = {
           email,  password: md5(password), captcha, emailcode
         }
         let res = await this.$http.post('/user/login', obj)
         if (res.code === 0) {
           // token的存储
          this.$message({
             type: 'success',
             message: '登录成功'
           })
           // token存起来
           localStorage.setItem('token', res.data.token)
           setTimeout(() => {
             this.$router.push('/')
           }, 500)
         } else {
           this.$message({
             type: 'error',
             message: res.message
           })
         }
       } else {
         console.error('校验失败')
       }
      },
      async sendEmailCode () {
         this.send.timer = 10
        const timer = setInterval(() => {
          this.send.timer -= 1
          if (this.send.timer === 0) {
            clearInterval(timer)
          }
        }, 1000)
        await this.$http.get('/sendcode?email='+this.form.email)
      },
      updateCaptcha () {
        this.code.captcha = `/api/captcha?_t=${new Date().getTime()}`
      },
    }
  }
</script>
<style lang="scss" scoped>
  .login-container {
    width: 400px;
    margin: 0 auto;
  }
</style>
