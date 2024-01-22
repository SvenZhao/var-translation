# [驼峰翻译助手](https://marketplace.visualstudio.com/items?itemName=svenzhao.var-translation)

[有问题直接报 issue](https://github.com/SvenZhao/var-translation/issues)

```
更新了免费的谷歌翻译引擎

长期自用优先使用自定义token的翻译服务
```

## 自建 翻译

docker-compose.yaml

```docker
version: '3.9'
services:
  libretranslate:
    # 只要中英翻译
    command: '--load-only zh,en'
    image: libretranslate/libretranslate
    restart: unless-stopped
    ports:
      - '5000:5000'
    volumes:
      - './lt-local:/home/libretranslate/.local'
    #   - './libretranslate_api_keys:/app/db/api_keys.db'
    # # Uncomment this section and the `volumes` section if you want to backup your API keys
    # environment:
    #   - LT_API_KEYS_DB_PATH=/app/db/api_keys.db # Same result as `db/api_keys.db` or `./db/api_keys.db`
```

## 支持的翻译引擎

- 谷歌 免费的爬虫翻译服务 但是不稳定 经常受到网络影响
- 百度翻译 需要 token [申请步骤请查看](https://hcfy.app/docs/services/baidu-api)
- 腾讯翻译君 需要 token [申请步骤请查看](https://hcfy.app/docs/services/qq-api)
  ![image.png](https://s2.loli.net/2022/04/27/3GVQkIyZdsv2fYC.png)

---

## 指定转换类型命令

![image2.png](https://s2.loli.net/2022/04/12/JOEYamiZAPMdfcg.png)

## 转换类型命令 设置快捷键

![image.png](https://s2.loli.net/2022/04/12/MvIZTaCiPpr35kA.png)

---

## 英文不好 写代起变量时候 你是否一直这样干?

- 打开翻软件
- 输入中文
- 复制翻译结果
- 粘贴英文修改成相应的命名格式

---

## 现在你只需要按动图这样来就可以了

- 选中输入文案 一键得到翻译结果(悄悄告诉你 直接选中英文还可以跳过翻译哦 快速改变命名格式)
- 选择响应的命名格式
  ![feature X](images/vscode1.gif)

## 快捷键

    win: "Alt+shift+t"
    mac": "cmd+shift+t"
