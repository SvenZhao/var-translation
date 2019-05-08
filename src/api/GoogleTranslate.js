import { youdao, baidu, google } from 'translation.js'
google.translate('test').then(result => {
    console.log(result) // result 的数据结构见下文
})