# [驼峰翻译助手](https://marketplace.visualstudio.com/items?itemName=svenzhao.var-translation)

[有问题直接报 issue](https://github.com/SvenZhao/var-translation/issues)

```
    新增 英汉互译\r,
    新增 翻译结果展示\r,
    新增 chagpt 支持自定义模型\r,
    优化 chagpt提示语 更适合开发场景\r,
    优化 展示翻译异常时候错误消息 方便找原因\r,
```


## 自定义翻译引擎
  ![image.png](https://s2.loli.net/2022/04/27/3GVQkIyZdsv2fYC.png)

- 谷歌 免费的爬虫翻译服务 但是不稳定 经常受到网络影响
- 百度翻译 需要 token [申请步骤请查看](https://hcfy.app/docs/services/baidu-api)
- 腾讯翻译君 需要 token [申请步骤请查看](https://hcfy.app/docs/services/qq-api)
- chagpt(可自定义接入openapi 到其他模型引擎) 感谢 @iarjian
- libretranslate 自建翻译  感谢 @空巷一人
- deeplx 感谢 @没用的小废鼠
---

## 指定转换类型命令

![image2.png](https://s2.loli.net/2022/04/12/JOEYamiZAPMdfcg.png)

## 转换类型命令 设置快捷键

![image.png](https://s2.loli.net/2022/04/12/MvIZTaCiPpr35kA.png)

---

## 英文不好 那来个一键翻译变量
  ![feature X](images/vscode1.gif)

## 快捷键

    win: "Alt+shift+t"
    mac": "cmd+shift+t"



## 自建 翻译 (感谢 github:kongxiangyiren)

docker-compose.yaml

```yaml
version: '3.9'
services:
  libretranslate:
    # 只要中英翻译
    command: '--load-only zh,en'
    image: libretranslate/libretranslate
    restart: unless-stopped
    ports:
      - '5000:5000'
    # environment:
    #   - LT_API_KEYS=true # 使用 api
    #   - LT_REQ_LIMIT=1000 # 设置每个客户端每分钟的最大请求数(超出API密钥设置的限制)
    #   - LT_REQUIRE_API_KEY_SECRET=true # 需要使用API密钥才能以编程方式访问API，除非客户端还发送秘密匹配
    #   - LT_API_KEYS_DB_PATH=/app/db/api_keys.db # Same result as `db/api_keys.db` or `./db/api_keys.db`
    volumes:
      - './lt-local:/home/libretranslate/.local'
      # - './libretranslate_api_keys:/app/db'
```
