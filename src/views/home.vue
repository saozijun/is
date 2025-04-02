<template>
  <div class="box">
    <div class="r-box">
      <el-tabs v-if="token" v-model="activeName" class="demo-tabs" @tab-click="handleClick">
        <div class="b-title" v-if="!showDetail && (!noticesInfo || activeName == '捡漏')">
          <p>艾斯起飞</p>
          <el-button :icon="RefreshLeft" circle @click="reset" />
        </div>
        <el-tab-pane label="捡漏" name="捡漏">
          <Detail ref="detailRef" @backOk="detailBack" v-if="showDetail"></Detail>
          <div class="cp-list" v-loading="loading" v-else>
            <div v-for="(item, index) in cpList" :key="index" class="cp-item" @click="toDetail(item)">
              <div class="cp-img">
                <img :src="item.image" alt="" />
              </div>
              <div class="cp-title">
                <p class="cp-title-desc">{{ item.title }}</p>
                <p>{{ item.pay_price ? item.pay_price : '退市' }}</p>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="公告" name="公告">
          <div class="notices-title" v-if="noticesInfo">
            <el-button :icon="Back" circle @click="noticesInfo = null" />
            <div style="margin-top: 20px;" v-html="noticesInfo.content"></div>
          </div>
          <ul v-else v-infinite-scroll="load" class="notices-list" v-loading="loading">
            <li v-for="(v, i) in noticesList" :key="i" class="notices-list-item" @click="noticesdetail(v.id)">
              <img :src="v.image" alt="">
              <div class="item-info">
                <p>{{ v.title }}</p>
                <div class="item-tips">
                  <el-tag type="primary">{{ v.name }}</el-tag>
                  <p class="item-time">{{ v.created_at }}</p>
                </div>
              </div>
            </li>
          </ul>
        </el-tab-pane>
      </el-tabs>
      <div v-else style="height: 100%; display: flex; align-items: center; justify-content: center;">
        请先登录
      </div>
    </div>
    <div class="user-box">
      <div class="login">
        <el-form v-if="!isLogin" label-position="right" label-width="auto" :model="loginForm" :rules="rules"
          ref="loginFormRef">
          <el-form-item label="账号：" prop="username">
            <el-input v-model.trim="loginForm.username" placeholder="请输入账号" clearable></el-input>
          </el-form-item>
          <el-form-item label="密码：" prop="password" style="margin-bottom: 0px;">
            <el-input v-model.trim="loginForm.password" show-password placeholder="请输入密码" clearable
              @keyup.enter.exact="handleLogin">
            </el-input>
          </el-form-item>
          <div style="display: flex; justify-content: flex-end;">
            <el-checkbox v-model="remember" label="记住账号" size="large" />
          </div>
        </el-form>
        <div class="info" v-else>{{ maskPhoneNumber(loginForm.username) }}_成功登录！</div>
        <div class="info-btn">
          <el-button color="#626aef" v-if="isLogin" @click="clearCache">清除缓存退出</el-button>
          <el-button type="primary" @click="handleLogin">{{ isLogin ? "退出登录" : "登录" }}</el-button>
        </div>
        <div class="wx-send">
          <p>没时间看？扫码绑定微信推送！</p>
          <img
            src="https://wxpusher.zjiecode.com/api/qrcode/wlk9WSisqBFb9Osd7STfQ89mSmLEG6eCZc8oibYLewTbgXUTAKELA4gViWBILV96.jpg"
            alt="推送二维码">
          <div class="send-code">
            <span>扫码关注获取UID, 填写 UID 进行捡漏推送</span>
            <p v-if="UID">UID: {{ UID }}</p>
            <el-button type="primary" @click="dialogVisible = true">{{UID ? "修改UID" : "填写UID"}}</el-button>
          </div>
        </div>
      </div>
    </div>
    <el-dialog v-model="dialogVisible" title="UID设置" width="500">
      <el-input v-model.trim="tempUid" placeholder="请输入UID" clearable></el-input>
      <el-checkbox v-model="rememberUid" label="记住UID" size="large" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false;">取消</el-button>
          <el-button type="primary" @click="saveUID">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from "vue";
import crypto from "../utils/crypto";
import { RefreshLeft, Back } from "@element-plus/icons-vue";
import axios from "axios"
import { ElMessage } from 'element-plus'
import Detail from "./components/Detail.vue";

const cpList = ref([]);
const UID = ref(null);
const rememberUid = ref(true);
const noticesInfo = ref(null);
const dialogVisible = ref(false);
const tempUid = ref("");
const loading = ref(false);
const noticesList = ref([])
const noticesTotal = ref(0);
const showDetail = ref(false);
const remember = ref(true);
const detailRef = ref();
const loginFormRef = ref();
const isLogin = ref(false);
const activeName = ref("捡漏");
const token = ref("");
const noticeQuery = ref({
  limit: 10,
  page: 1,
});
const loginForm = ref({
  username: "",
  password: "",
});

watch(activeName, (val) => {
  if (val == "捡漏") {
    getCPList();
  } else {
    getnewnotices()
  }
});
const reset = () => {
  if (activeName.value == "捡漏") {
    document.querySelector(".cp-list").scrollTop = 0;
    getCPList();
  } else {
    noticeQuery.value.page = 1
    document.querySelector(".notices-list").scrollTop = 0;
    getnewnotices()
  }
};
const maskPhoneNumber = (phone) => {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1********');
}

const rules = {
  username: [{ required: true, message: "账号不能为空", trigger: "blur" }],
  password: [{ required: true, message: "密码不能为空", trigger: "blur" }],
};

onMounted(() => {
  // let str = "sFQpXFByHRYTToaInvdpVsc OKr5WJVLWPFY1/ChIT2NA/W2O 6NVa51py0XCiUd"
  // console.log(crypto.decrypt(decodeURIComponent(str)));
  if (localStorage.getItem("user")) {
    loginForm.value = JSON.parse(localStorage.getItem("user"));
  }
  if (localStorage.getItem("UID")) {
    UID.value = localStorage.getItem("UID");
  }
  token.value = localStorage.getItem("token");
  if (token.value) {
    isLogin.value = true;
    loginForm.value.username = localStorage.getItem("username");
    getCPList();
  }
});

const getCPList = async () => {
  let query = {
    field: "upo.created_at",
    is_free: "0",
    lable: "全部",
    limit: 9999,
    page: 1,
    sign_time: parseInt(new Date().getTime() / 1000),
    sort: "desc",
    title: "",
    type: -1,
  }
  try {
    loading.value = true;
    let res = await axios.get("/api/market/newpacklist?data=" + encodeURIComponent(crypto.encrypt(JSON.stringify(query))), {
      headers: { Authorization: "Bearer " + token.value }
    })
    let data = JSON.parse(crypto.decodeUnicode(crypto.decrypt(res.data)))
    if (data.code == 1000) {
      cpList.value = data.data.data;
    } else {
      ElMessage.error(data.message)
    }
    loading.value = false;
  } catch (error) {
    loading.value = false;
    let err = JSON.parse(crypto.decodeUnicode(crypto.decrypt(error.response.data)))
    if (err.errcode == 1002) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      isLogin.value = false;
      ElMessage.error(err.errmsg)
    }
  }
};

const toDetail = (item) => {
  showDetail.value = true;
  nextTick(() => {
    detailRef.value.open(item, token.value, UID.value);
  })
};

const handleClick = (tab, event) => {
  // console.log(tab, event);
};

const clearCache = () => {
  localStorage.clear();
  isLogin.value = false;
  showDetail.value = false;
  cpList.value = [];
  UID.value = null;
  loginForm.value = {};
  token.value = "";
};
const handleLogin = async () => {
  if (isLogin.value) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    isLogin.value = false;
    showDetail.value = false;
    token.value = "";
    return;
  }
  await loginFormRef.value.validate()
  let tempData = {
    username: loginForm.value.username,
    password: loginForm.value.password,
    sign_time: parseInt(new Date().getTime() / 1000),
  };
  let res = await axios.post("/api/login/index", { data: crypto.encrypt(JSON.stringify(tempData)) })
  let data = JSON.parse(crypto.encodeData(res.data))
  if (data.code == 1000) {
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("username", loginForm.value.username);
    if (remember.value) {
      localStorage.setItem("user", JSON.stringify(loginForm.value));
    } else {
      localStorage.removeItem("user");
    }
    token.value = data.data.token;
    isLogin.value = true;
    getCPList();
    ElMessage.success(data.message)
  } else {
    ElMessage.error(data.message)
  }
};

const detailBack = () => {
  showDetail.value = false;
};

const getnewnotices = async () => {
  let tempData = {
    ...noticeQuery.value,
    title: "",
    type: 1,
    notices_class_id: 0,
    sign_time: parseInt(new Date().getTime() / 1000),
  };
  try {
    loading.value = true;
    let res = await axios.post("/api/index/getnewnotices", { data: crypto.encrypt(JSON.stringify(tempData)) })
    let data = JSON.parse(crypto.decodeUnicode(crypto.decrypt(res.data)))
    if (data.code == 1000) {
      if (noticeQuery.value.page == 1) {
        noticesList.value = data.data.data;
      } else {
        noticesList.value = [...noticesList.value, ...data.data.data];
      }
      noticesTotal.value = data.data.total;
    } else {
      ElMessage.error(data.message)
    }
    loading.value = false;
  } catch (error) {
    loading.value = false;
  }

}

const noticesdetail = async (id) => {
  let tempData = { 
    id: id + "",
    sign_time: parseInt(new Date().getTime() / 1000)
  };
  const safeData = JSON.stringify(tempData).replace(/\s+/g, "");
  try {
    let res = await axios.get("/api/login/noticesdetail?data=" + encodeURIComponent(crypto.encrypt(safeData)), {
      headers: { Authorization: "Bearer " + token.value }
    })
    let data = JSON.parse(crypto.decodeUnicode(crypto.decrypt(res.data)))
    if (data.code == 1000) {
      noticesInfo.value = data.data;
    } else {
      ElMessage.error(data.message)
    }
  } catch (error) {}

}

const load = () => {
  if (noticesTotal.value > noticesList.value.length) {
    noticeQuery.value.page++;
    getnewnotices();
  }
}

const saveUID = () => {
  dialogVisible.value = false;
  UID.value = tempUid.value;
  if (rememberUid.value) localStorage.setItem("UID", UID.value);
}
</script>

<style lang="scss" scoped>
.box {
  width: 90%;
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
  background-color: #ffffff;
  display: flex;
  gap: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .r-box {
    flex: 1;

    .cp-list {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin-top: 10px;

      .cp-item {
        width: calc(24.7% - 16px);
        min-width: 180px;
        transition: all 0.3s ease;
        cursor: pointer;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .cp-img {
          width: 100%;
          height: 120px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
          }
        }

        .cp-title {
          padding: 12px 10px;
          font-size: 14px;
          color: #333;

          background-color: #f9f9f9;
          display: flex;
          justify-content: space-between;
          gap: 10px;

          .cp-title-desc {
            white-space: nowrap;
            text-align: center;
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }
    }
  }

  .user-box {
    width: 320px;
    min-width: 320px;
    padding: 25px;
    background-color: #f9f9f9;
    border-radius: 6px;

    .login {
      width: 100%;

      .info {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #e8f5e9;
        border-radius: 4px;
        color: #2e7d32;
      }

      .el-form-item {
        margin-bottom: 20px;
      }
    }

    .el-button {
      width: 100%;
      margin-top: 10px;
      height: 40px;
      font-weight: 500;
    }
  }
}

@media screen and (max-width: 992px) {
  .box {
    flex-direction: column;

    .user-box {
      width: 100%;
    }
  }
}

:deep(.el-tabs__content) {
  overflow: inherit;
}

.notices-list {
  overflow: auto;
  padding: 0;
  height: 700px;
  list-style: none;

  .notices-list-item {
    padding: 10px;
    display: flex;
    border-radius: 6px;
    gap: 10px;
    cursor: pointer;
    &:hover{
      background: linear-gradient(to top, rgba(202, 202, 202, 0.274), rgba(255, 255, 255, 0));
    }
    .item-info {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .item-tips {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .item-time {
          font-size: 14px;
          color: #999;
        }
      }
    }

    >img {
      width: 150px;
      height: 100px;
      border-radius: 6px;
    }
  }
}

.b-title {
  display: flex;
  justify-content: space-between;
  align-items: center;

  p {
    font-weight: bold;
  }
}

.wx-send {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;

  p {
    font-size: 12px;
    color: #999;
  }

  img {
    width: 180px;
    margin-top: 10px;
  }
}

.send-code {
  font-size: 14px;
}

.info-btn{
  display: flex;
  align-items: center;
}
</style>
