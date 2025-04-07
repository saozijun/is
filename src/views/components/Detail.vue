<template>
    <el-form ref="formRef" :model="formData" :rules="rules" style="padding-right: 30px">
        <div class="top-title">
            <h1>{{ info.title }}</h1>
            <div class="msg" v-if="isStart && !tipsMode">
                状态：{{ jlmsg }}
            </div>
        </div>
        <div class="query">
            <div>
                <el-button :icon="Back" circle @click="back" />
                <el-button :icon="RefreshLeft" circle @click="reset" />
                <el-tooltip content="切换提示模式" placement="top">
                    <el-button :icon="Switch" circle @click="tipsMode = !tipsMode" />
                </el-tooltip>
            </div>
            <div>
                <el-form-item required label="类型" prop="type">
                    <el-select v-model="formData.type" placeholder="请选择" :popper-append-to-body="false"
                        style="width: 100px">
                        <el-option label="批量" value="批量" />
                        <el-option label="自助" value="自助" />
                    </el-select>
                </el-form-item>
            </div>
            <div v-if="formData.type == '批量'">
                <el-form-item required label="价格" prop="price">
                    <el-input type="number" style="width: 100px" v-model="formData.price" placeholder="请输入" />
                </el-form-item>
            </div>
            <div>
                <el-form-item required label="延迟" prop="delay">
                    <el-input type="number" style="width: 100px" v-model="formData.delay" placeholder="请输入" />
                </el-form-item>
            </div>
            <div>
                <el-button type="primary" @click="start" :loading="isStart">{{ isStart ? '捡漏中' : '开始捡漏' }}</el-button>
                <el-button type="primary" v-if="isStart" @click="isStart = false;">停止</el-button>
            </div>
        </div>
    </el-form>
    <div class="lable-list">
        <div class="lable-item" :class="{'l-active': v === activecjLabel}" v-for="(v, i) in labelcjList" :key="i" @click="activecjLabel = v">
        {{ v }}
        </div>
    </div>
    <div v-if="activecjLabel == '藏品'">
        <div class="list" v-loading="loading" v-if="cpInfo.length" v-infinite-scroll="load">
            <div class="item" v-for="(item, index) in cpInfo" :key="index">
                <div class="item-top">
                    <div class="title">
                        <p>{{ info.title }}</p>
                        <el-tag :type="item.lock_uid ? 'danger' : 'warning'">{{ item.lock_uid ? '锁定中' : '寄售中' }}</el-tag>
                    </div>
                    <p class="tips">#{{ item.pack_num }}/{{ info.all_num }}</p>
                </div>
                <p class="price"><span>￥</span>{{ item.pay_price }}</p>
            </div>
            <div class="load" v-if="isShowAll">已加载全部 ~</div>
        </div>
        <el-empty v-else description="暂无挂单" :image-size="100" />
    </div>
    <div v-else class="cj-box">
        <div class="cj-top">
            <div>当前地板价 ￥{{ cjInfo.floor }}</div>
            <div>今日最高 ￥{{ cjInfo.max }}</div>
            <div>今日最低 ￥{{ cjInfo.min || '-' }}</div>
            <div>今日成交量 {{ cjInfo.day }}</div>
            <div>小时成交量 {{ cjInfo.hour }}</div>
        </div>
        <div class="cj-list">
            <div class="cj-item" v-for="(item, index) in cjInfo.list" :key="index">
                <div>
                    <p>{{ info.title }}#{{ item.pack_num }}</p>
                    <span>￥{{ item.pay_price }}</span>
                </div>
                <div>
                    <p>{{ item.hash }}</p>
                    <span>{{ item.time }}</span>
                </div>
            </div>
        </div>
    </div>
    <el-dialog
        v-model="dialogVisible"
        title="捡到咯"
        width="500">
        <div class="pay-info" v-if="formData.type == '自助'">
            <div>{{ info.title }}</div>
            <div>支付编号：{{ getItem.order_sn }}</div>
            <div class="pay-link">支付链接：<span @click="copy(getItem.url)">{{ getItem.url }}</span></div>
        </div>
        <div class="pay-info" v-else>
            <div>{{ info.title }}</div>
            <div>批量下单成功，请上号支付！！</div>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <el-button type="primary" @click="dialogVisible = false">确定</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import crypto from "../../utils/crypto";
import axios from "axios";
import { ElMessage, ElNotification } from "element-plus";
import { Back, RefreshLeft, Switch } from "@element-plus/icons-vue";
const labelcjList = ref([ "藏品", "成交数据" ])
const activecjLabel = ref("藏品");
const cjInfo = ref({});
const cpInfo = ref([]);
const tipsMode = ref(false);
const info = ref({});
const dialogVisible = ref(false);
const getItem = ref({});
const total = ref(0);
const UID = ref(null);
const loading = ref(false);
const isShowAll = ref(false);
const id = ref(null);
const timer = ref(null);
const isStart = ref(false);
const formRef = ref();
const token = ref("");
const query = ref({
    page: 1,
    limit: 20,
    type_field: 1,
});
const emit = defineEmits(["backOk"]);
const defaultObj = {
    price: "",
    delay: 150,
    type: "自助",
};
const formData = ref({ ...defaultObj });
const rules = {
    price: [{ required: true, message: "请输入价格", trigger: "blur" }],
    type: [{ required: true, message: "请选择类型", trigger: "blur" }],
    delay: [{ required: true, message: "请输入延迟", trigger: "blur" }],
};

watch(isStart, (val) => {
    if (val) {
        if (formData.value.type == "自助") {
            timer.value = setInterval(()=>{
                self();
            }, formData.value.delay)
        } else {
            timer.value = setInterval(()=>{
                batch();
            }, formData.value.delay)
        }
    } else {
        clearInterval(timer.value);
        timer.value = null
    }
})

const back = async () => {
    clearInterval(timer.value);
    timer.value = null
    id.value = null;
    emit("backOk");
};

watch(activecjLabel, (val) => {
  if (val == "成交数据") {
    getCJList();
  } else {
    query.value.page = 1;
    getDetail();
  }
});

const getCJList = async ()=>{
  let query = {
    collection_id: id.value,
    sign_time: parseInt(new Date().getTime() / 1000) + 50,
  }
  try {
    loading.value = true;
    let res = await axios.get("/api/market/stats?data=" + encodeURIComponent(crypto.encrypt(JSON.stringify(query))), {
      headers: { Authorization: "Bearer " + token.value }
    })
    let data = JSON.parse(crypto.decodeUnicode(crypto.decrypt(res.data)))
    if (data.code == 1000) {
        cjInfo.value = data.data
    } else {
      ElMessage.error(data.message)
    }
    loading.value = false;
  } catch (error) {
    loading.value = false;
  }
}

const getDetail = async () => {
    if (!id.value) return;
    let tempQuery = {
        ...query.value,
        collection_id: id.value,
        sign_time: parseInt(new Date().getTime() / 1000) + 50
    };
    try {
        loading.value = true;
        let res = await axios.get(
            "/api/market/newpackorderlistdetail?data=" +
            encodeURIComponent(crypto.encrypt(JSON.stringify(tempQuery))),
            { headers: { Authorization: "Bearer " + token.value } }
        );
        let data = JSON.parse(crypto.decodeUnicode(crypto.decrypt(res.data)));
        if (data.code == 1000) {
            if (query.value.page == 1) {
                cpInfo.value = data.data.data;
            } else {
                cpInfo.value = [...cpInfo.value, ...data.data.data];
            }
            total.value = data.data.total;
        } else {
            ElMessage.error(data.message);
        }
        loading.value = false;
    } catch (error) {
        loading.value = false;
        let err = JSON.parse(
            crypto.decodeUnicode(crypto.decrypt(error.response.data))
        );
        if (err.errcode == 1002) {
            ElNotification({
                title: '提示',
                message: err.errmsg,
                type: 'warning',
            })
        }
    }
};

const open = async (row, tk, ud) => {
    token.value = tk;
    info.value = row;
    id.value = row.id;
    UID.value = ud;
    getDetail()
};

const load = () => {
    if (query.value.page * query.value.limit >= total.value) {
        isShowAll.value = true;
        return
    }
    query.value.page++;
    getDetail()
};

const start = async () => {
    await formRef.value.validate();
    isStart.value = true;
};

const reset = () => {
    if (activecjLabel.value == "成交数据") {
        getCJList();
        return
    }
    query.value.page = 1;
    document.querySelector(".list").scrollTop = 0;
    getDetail();
};
const copy = (url) => {
    navigator.clipboard.writeText(url);
    ElMessage.success("支付链接已复制");
}
const jlmsg = ref("");
// 批量
const batch = async () => {
    const tempQuery = {
        collection_id: info.value.id,
        max_num: 9,
        max_price: formData.value.price,
        is_free: 0,
        sign_time: parseInt(new Date().getTime() / 1000) + 50
    }
    let res = await axios.post(
        "/api/userOrder/batchOrderCreate",
        { data: crypto.encrypt(JSON.stringify(tempQuery)) },
        { headers: { Authorization: "Bearer " + token.value } }
    );
    let data = JSON.parse(crypto.encodeData(res.data))
    if (data.code == 1000) {
        isStart.value = false;
        dialogVisible.value = true;
        send();
    } else {
        if (tipsMode.value) {
            ElNotification({
                title: '提示',
                message: data.message,
                duration: 1500,
                type: 'warning',
            })
        } else{
            jlmsg.value = data.message;
        }
    }
}

// 自助
const self = async () => {
    const tempQuery = {
        collection_id: info.value.id,
        returnurl: "https://h5.iswenchuang.cn/#/pages/market/detail",
        sign_time: parseInt(new Date().getTime() / 1000) + 50
    }
    let res = await axios.post(
        "/api/userOrder/fastMarketOrderCreate",
        { data: crypto.encrypt(JSON.stringify(tempQuery)) },
        { headers: { Authorization: "Bearer " + token.value } }
    );
    let data = JSON.parse(crypto.encodeData(res.data))
    if (data.code == 1000) {
        isStart.value = false;
        dialogVisible.value = true;
        getItem.value = data.data;
        send();
    } else {
        if (tipsMode.value) {
            ElNotification({
                title: '提示',
                message: data.message,
                duration: 1500,
                type: 'warning',
            })
        } else{
            jlmsg.value = data.message;
        }
    }
}

// wx消息推送
const send = async () => {
    if (!UID.value) return;
    await axios.post(
        "https://wxpusher.zjiecode.com/api/send/message",
        {
            appToken: "AT_WRHD1JXupS1PDA4bg0aTiJCTDrEtg7Sy",//必传
            content:`<h1>${info.value.title}-捡漏成功</h1><br/><p>请速速上号支付！</p>`,//必传
            summary:"艾斯捡漏成功",
            contentType:2,
            uids:[ UID.value ],
            verifyPay:false, 
            verifyPayType:0 
        }
    );
}

// 向外暴露方法
defineExpose({
    open,
});
</script>

<style lang="scss" scoped>
.list {
    height: 700px;
    overflow: auto;

    .item {
        display: flex;
        padding: 10px 0;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f1f1;

        .item-top {
            p {
                font-weight: bold;
            }
        }

        .title {
            display: flex;
            gap: 20px;
            align-items: center;
            font-weight: bold;
        }

        .tips {
            font-size: 14px;
            color: #999;
        }

        .price {
            font-size: 14px;
            font-weight: bold;
            span {
                font-size: 10px;
            }
        }
    }
}
.top-title{
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    h1{
        font-weight: bold;
        font-size: 18px;
    }
    gap: 20px;
}
.query {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.load {
    text-align: center;
    margin: 10px;
    font-size: 14px;
    color: #999;
}

.pay-info{
    width: 100%;
    .pay-link{
        width: 100%;
        span{
            width: 100%;
            color: var(--el-color-primary);
            &:hover{
                color: var(--el-color-primary-dark-2);
                cursor: pointer;
                text-decoration: underline;
            }
        }
    }
}

.lable-list{
    display: flex;
    gap: 10px;
    align-items: center;
    .lable-item{
        border: 1px solid #eee;
        border-radius: 150px;
        padding: 3px 15px;
        font-size: 12px;
        transition: .2s all;
        cursor: pointer;
        &:hover{
            background: #ddebff;
            color: #2c7deead;
            border-color: #2c7deead;
        }
    }
    .l-active{
        background: #ddebff;
        color: #2c7deead;
        border-color: #2c7deead;
    }
}
.cj-top{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 20px 0;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    div{
        background-color: #409eff;
        color: #fff;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 12px;
        margin-right: 5px;
        &:nth-child(1){
            background-color: #626aef;
        }
        &:nth-child(2){
            background-color: #d72222;
        }
        &:nth-child(3){
            background-color: #2da438;
        }
 
    }
}

.cj-list{
    display: flex;
    flex-direction: column;
    gap: 10px;
    .cj-item{
        >div{
            display: flex;
            align-items: center;
            justify-content: space-between;
            &:nth-child(1){
                p{
                    font-weight: bold;
                }
                span{
                    font-size: 12px;
                    font-weight: bold;
                }
            }
            &:nth-child(2){
                p{
                    font-size: 12px;
                }
                span{
                    font-size: 12px;
                    color: #666;
                }
            }
        }
    }
}

</style>
