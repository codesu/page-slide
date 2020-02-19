/**
 * 生成pageManager实例
 * 可以在业务代码中直接实例化
 * 注意showPage要在page加完后再执行（如DOMContentLoaded或异步获取函数中），不然获取不到正确的页面数量
 */
import PageManager from '../util/pageManager';

export default new PageManager();
