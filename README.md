# h5 动画页面

## 页面组装
  通过在 `index.html` 直接插入模板，`webpack` 会通过 `DefinePlugin` 来解析。

## 页面管理 `util/pageManager`
  注册页面，绑定触摸事件。
  通过 `util/Middleware` 来注册中间件，管理进入，离开一系列动作。

## 绑定方法 `util/finger`
  观察者模式，触发 `touch` 事件

## 页面动画
  通过 `display: block / none` 来触发动画。
