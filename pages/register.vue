<template>
  <div>
    <div class="login-container">
      <el-form class="login-form"
               :model="form"
               label-position="left"
               label-width="60px"
               :rules="rules"
               ref="registerForm">
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
        <el-form-item prop="nickname"
                      label="昵称">
          <el-input v-model="form.nickname"
                    placeholder="请输入昵称"></el-input>
        </el-form-item>
        <el-form-item type="password" prop="password"
                      label="密码">
          <el-input v-model="form.password"
                    placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item type="password" prop="repeatpassword"
                      label="密码">
          <el-input v-model="form.repeatpassword"
                    placeholder="请再次输入密码"></el-input>
        </el-form-item>
        <el-form-item label="">
          <el-button type="primary" @click.native.prevent="handleRegister">注册</el-button>
        </el-form-item>

      </el-form>
    </div>
  </div>
</template>
<script>
import md5 from 'md5'
  export default {
    layout: 'login',
    data () {
      return {
        form: {
          email: 'mpy_yang@163.com',
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
          ],
          repeatpassword: [
            { required: true,  message: '请输入邮箱', trigger: 'blur' },
            { validator: (rule, value, callback) => {
              if (value !== this.form.password) {
                callback(new Error('两次密码不一样!'))
              }
              callback()
            }}
          ]
        },
        code: {
          captcha: '/api/captcha'
        }
      }
    },
    methods: {
      async handleRegister () {
       let valid = await this.$refs.registerForm.validate()
       if (valid) {
         console.log('校验成功; ')
         const { email, nickname, password, captcha } = this.form
         let obj = {
           email, nickname, password: md5(password), captcha
         }
         let res = await this.$http.post('/user/register', obj)
         if (res.code === 0) {
           this.$confirm('注意', '去登陆', {
             confirmButton: '登录',
             callback:()=> {
               this.$router.push('/login')
             }
           })
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
