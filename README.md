# handle api

[handle](https://github.com/antfu/handle) 的 API。

可以编程式地操作 `handle`，使用 puppeteer 模拟用户操作。

## 安装

1. 首先安装 [bun](https://bun.sh/)；
2. 进入 server 目录：
    ```bash
    cd server
    ```
3. 安装依赖：
    ```bash
    bun i
    ```
4. 运行：
    ```bash
    bun dev
    ```
5. 指定监听的端口和主机
    ```bash
    HOSTNAME=0.0.0.0 PORT=3000 bun dev
    ```

## 使用方式

1. `POST /new`
    开始一局新的游戏，返回 sessionId 和答案。

    使用 json 格式的 body 指定游戏参数：

    **请求体**
    ```json5
    {
        "limit": 6, // 默认 6
        "mode": "py", // "sp-sougou" | "sp-xiaohe" | "py" | "zy" (双拼-搜狗 | 双拼-小鹤 | 拼音 | 注音)，默认为 "py"
        "strict": false // 是否检查每次输入的成语在不在词库中，默认为 false
    }
    ```

    **响应体**

    ```json5
    {
        "session": "683f1ae7-fdf7-4a86-b4a9-59e95dbf08cb",
        "idiom": "事倍功半"
    }
    ```
2. `POST /guess` 
    猜测一个成语，返回猜测结果。

    **请求体**
    ```json5
    {
        "session": "683f1ae7-fdf7-4a86-b4a9-59e95dbf08cb",
        "guess": "临渊羡鱼"
    }
    ```

    **响应体**
    ```json5
    {
        "success": false,
        "code": 200,
        "guesses": [
            "临渊羡鱼"
        ],
        "remainingAttempts": 5,
        "attemptedTimes": 1
    }
    ```

    ```json5
    {
        "error": "输入不合法，请检查字数",
        "code": 400
    }
    ```

    ```json5
    {
        "success": true,
        "time": 45455,
        "idiom": "事倍功半",
        "explanation": "事倍功半：\nn比喻费力大而收效小。也作“力倍功半”。\n——清·李宝嘉《官场现形记》：“要做善事；靠着善书教化人；终究事倍功半。”",
        "code": 200,
        "guesses": [
            "临渊羡鱼",
            "事倍功半"
        ],
        "attemptedTimes": 2,
        "remainingAttempts": 4
    }
    ```
3. `GET /image/:session`
    获取游戏截图。

    **响应体**
    返回图片文件。