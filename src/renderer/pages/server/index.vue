<template lang="pug">
  #gak-main
    #gak-main-head
      i.el-icon-more#gak-main-head-back(@click="$emit('changeSide')")
      span#gak-main-head-title Server
      el-breadcrumb#gak-main-head-bread(separator='/')
        el-breadcrumb-item 服务
    #gak-main-server
      el-container
        el-header
          el-steps(:active="active", align-center, finish-status="success")
            el-step(title="开始作业")
            el-step(title="设置班级")
            el-step(title="开启服务")
        el-main.basic
          el-form(:model="form" label-width="80px" label-position="left")
            transition(name="slide-fade", mode="out-in")
              .basicStart(v-if="active===0", :key="0")
                el-alert.gak-text-left(title="开始使用", type="success", description="您只需要简单的三步即可开启本次作业的收取！现在，请选择您要开启的作业。")
                el-form-item.gak-text-left(label="作业")
                  el-select(v-model="form.jobName", placeholder='请选择或输入', filterable)
                    el-option(v-for="jobJson in jobJsons", :key="jobJson.jobName", :label="jobJson.jobName", :value="jobJson.jobName")
                  span.gak-text-placeholder 没有作业？
                    a.gak-job-create(@click="createJob") 点击创建
                el-form-item(label="时间(分钟)")
                  el-slider(v-model="form.time", :min="1", :max="120", label="提交时间", show-input)
              .basicData(v-if="active===1", :key="1")
                el-alert.gak-text-left(title="设置班级", type="success", description="接下来，请选择您要开启的班级。")
                el-form-item.gak-text-left(label="班级")
                  el-select(v-model="form.className", placeholder='请选择或输入', filterable)
                    el-option(v-for="classJson in classJsons", :key="classJson.className", :label="classJson.className", :value="classJson.className")
                  span.gak-text-placeholder 没有班级？
                    a.gak-job-create(@click="createClass") 点击创建
              .basicServer(v-if="active===2", :key="2")
                el-alert.gak-text-left(title="最后一步", type="success", description="最后，您只需要设置学生端的端口就完成了。(127.0.0.1 只能本机访问，建议选择 WIFI、 10 或 192 开头的网卡)")
                el-form-item.gak-text-left(label="地址")
                  el-select(v-model="ip", placeholder='请选择或输入', filterable, style="width:100%")
                    el-option(v-for="ipData in ips", :key="ipData.name", :label="ipData.info", :value="ipData.ip")
                el-form-item(label="端口号", style="text-align:left;")
                  el-input-number.gak-text-left(v-model='port', :step='50')

                el-button(@click="openServer", type="primary", v-if="active===2") 开启服务

        el-footer
          el-button-group
            transition(name="el-fade-in", mode="out-in")
              el-button(type="primary", icon="el-icon-arrow-left", v-bind:disabled="active===0", @click="prev") 上一步
            transition(name="el-fade-in", mode="out-in")
              el-button(type="primary", icon="el-icon-arrow-right", v-bind:disabled="active===2", @click="next") 下一步


</template>

<script>
import { Loading } from "element-ui";
import { runInNewContext } from "vm";
import { clearInterval } from "timers";
import { globalBus } from "@/utils/_global";
const { verifyNull } = require("@/api/judge");
const { getClassToJobDb, getClassDb, getJobDb, getIpDb } = require("@/api/db");
const { error, success, warning } = require("@/api/message");
const { ipcRenderer, remote } = require("electron");
const path = require("path");
const os = require("os");
export default {
  data() {
    return {
      active: 0,
      form: {
        className: null,
        jobName: null,
        startTime: null,
        time: 30,
        timestamp: null,
        status: 1,
        unfinishedStudents: null,
        studentNum: null
      },
      ip: null,
      ips: [],
      port: 8888,
      jobJsons: [],
      classJsons: []
    };
  },
  mounted() {
    let _this = this;
    let classToJobDb = getClassToJobDb();
    classToJobDb.findByStatus(1).exec((e, classToJobJsons) => {
      if (classToJobJsons.length > 0) {
        globalBus.$emit("changeMenu", "monitor");
        warning(_this, "服务已开启 切换到监控页面");
        _this.$router.push({
          name: "monitor"
        });
      }
    });

    let networkInterfaces = os.networkInterfaces();
    for (let networkInterface in networkInterfaces) {
      const reg =
        "(?=(\\b|\\D))(((\\d{1,2})|(1\\d{1,2})|(2[0-4]\\d)|(25[0-5]))\\.){3}((\\d{1,2})|(1\\d{1,2})|(2[0-4]\\d)|(25[0-5]))(?=(\\b|\\D))";
      if (networkInterfaces[networkInterface][0].address.search(reg) >= 0) {
        _this.ips.push({
          name: networkInterface,
          ip: networkInterfaces[networkInterface][0].address,
          info:
            "网卡：" +
            networkInterface +
            "（" +
            networkInterfaces[networkInterface][0].address +
            "）"
        });
      }
      if (networkInterfaces[networkInterface][1].address.search(reg) >= 0) {
        _this.ips.push({
          name: networkInterface,
          ip: networkInterfaces[networkInterface][1].address,
          info:
            "网卡：" +
            networkInterface +
            "（" +
            networkInterfaces[networkInterface][1].address +
            "）"
        });
      }
    }
    let jobDb = getJobDb();
    //查找数据之后创建
    jobDb.findAllJob().exec((e, jobJsons) => {
      if (e) {
        error(_this, "数据导入出错");
      } else {
        _this.jobJsons = jobJsons;
        let classDb = getClassDb();
        classDb.findAllClass().exec((e, classJsons) => {
          if (e) {
            error(_this, "数据导入出错");
          } else {
            _this.classJsons = classJsons;
          }
        });
      }
    });
  },
  methods: {
    openServer: function(event) {
      let _this = this;
      if (!(verifyNull(_this.port) && verifyNull(_this.ip))) {
        warning(_this, "地址和端口不能为空");
        return;
      }
      Loading.service({ fullscreen: true });
      let webServer = remote.getGlobal("webServer");
      for (const classJson of _this.classJsons) {
        if (classJson.className == _this.form.className) {
          let time = new Date();
          _this.form.studentNum = classJson.students.length;
          _this.form.unfinishedStudents = classJson.students;
          _this.form.startTime = time.toLocaleString();
          _this.form.timestamp = time.getTime();
          break;
        }
      }
      let callBack = function(e, docs) {
        if (e) {
          error(_this, "开启服务错误");
        } else {
          let ipDb = getIpDb();
          ipDb.deleteAllIp(() => {});
          webServer.start(
            _this.ip,
            _this.port,
            _this.form.time,
            _this.form.jobName,
            _this.form.className,
            _this.form.timestamp
          );
          Loading.service({ fullscreen: true }).close();
          success(_this, "服务已开启 切换到监控页面");
          _this.$router.push({
            name: "monitor"
          });
          globalBus.$emit("changeMenu", "monitor");
        }
      };
      let classToJobDb = getClassToJobDb();
      classToJobDb.insertClassToJob(_this.form, callBack);
    },
    prev: function(event) {
      if (this.active-- < 0) {
        this.active = 0;
      }
    },
    next: function(event) {
      let _this = this;
      if (_this.active == 0) {
        if (!(verifyNull(_this.form.jobName) && verifyNull(_this.form.time))) {
          warning(_this, "作业不能为空");
          return;
        }
      }
      if (_this.active == 1) {
        if (!verifyNull(_this.form.className)) {
          warning(_this, "班级不能为空");
          return;
        }
      }
      if (this.active++ > 2) {
        this.active = 2;
      }
    },
    createJob: function() {
      this.$router.push({
        name: "job"
      });
      globalBus.$emit("changeMenu", "job");
    },
    createClass: function() {
      this.$router.push({
        name: "class"
      });
      globalBus.$emit("changeMenu", "class");
    }
  }
};
</script>


<style lang="stylus" scoped>
@import '../../styles/server/index.styl';
</style>
