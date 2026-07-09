document.addEventListener('DOMContentLoaded', () => {
    const ASSET_PASSPHRASE = 'maltese-local-assets-2026-07';
    const ENCRYPTED_ASSETS = {
        loginBackground: 'src/2.png.enc',
        letterBackground: 'src/1.png.enc',
        passwordHint: 'src/password.png.enc',
        letter: 'src/letter.txt.enc'
    };

    // 获取DOM元素
    const videoSection = document.getElementById('video-section');
    const loginSection = document.getElementById('login-section');
    const letterSection = document.getElementById('letter-section');
    
    const video = document.getElementById('intro-video');
    const skipBtn = document.getElementById('skip-btn');
    const playBtn = document.getElementById('play-btn');
    
    const passwordInput = document.getElementById('password-input');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    const hintBox = document.getElementById('hint-box');
    const closeHintBtn = document.getElementById('close-hint');
    const hintImage = document.getElementById('hint-image');
    
    const letterPaper = document.querySelector('.letter-paper');
    const letterText = document.getElementById('letter-text');
    const loginBackground = document.querySelector('[data-encrypted-bg="login"]');
    const letterBackground = document.querySelector('[data-encrypted-bg="letter"]');

    const objectUrls = [];
    let encryptedAssetsReady = false;

    // 信件内容会在密码正确后解密
    let letterContent = "正在加载信件...";

    loadPublicEncryptedAssets();

    // 1. 视频播放逻辑
    
    // 兼容微信自动播放（微信浏览器特有）
    document.addEventListener("WeixinJSBridgeReady", function () {
        video.play();
    }, false);

    // 尝试自动播放
    video.muted = false; // 确保开启声音
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("带声音自动播放被阻止，等待用户交互");
            playBtn.innerHTML = "点击屏幕<br>开启惊喜";
            playBtn.classList.remove('hidden');
            
            // 只要用户点击屏幕任何地方，就开始播放
            const startPlay = () => {
                video.play();
                playBtn.classList.add('hidden');
                // 移除监听器
                document.removeEventListener('click', startPlay);
                document.removeEventListener('touchstart', startPlay);
            };
            
            document.addEventListener('click', startPlay);
            document.addEventListener('touchstart', startPlay);
        });
    }
    
    // 保留按钮点击作为双重保障
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止冒泡触发上面的document监听器（虽然没坏处）
        video.play();
        playBtn.classList.add('hidden');
    });

    // 视频结束事件
    video.addEventListener('ended', showLoginSection);

    // 跳过按钮事件
    skipBtn.addEventListener('click', () => {
        video.pause();
        showLoginSection();
    });

    // 切换到登录部分
    function showLoginSection() {
        videoSection.classList.remove('active');
        loginSection.classList.add('active');
        
        // 5秒后显示提示框
        setTimeout(() => {
            hintBox.classList.remove('hidden');
            hintBox.classList.add('show');
        }, 5000);
    }

    // 关闭提示框
    closeHintBtn.addEventListener('click', () => {
        hintBox.classList.remove('show');
    });

    // 2. 密码验证逻辑
    async function checkPassword() {
        const input = passwordInput.value.trim();
        submitBtn.disabled = true;
        errorMsg.textContent = "正在解密信件...";

        try {
            const letter = await decryptResource(ENCRYPTED_ASSETS.letter, input);
            letterContent = new TextDecoder().decode(letter.bytes);
            errorMsg.textContent = "";
            showLetterSection();
        } catch (error) {
            console.error('Letter decrypt failed:', error);
            errorMsg.textContent = encryptedAssetsReady ? "密码不对哦，再想想~" : "资源还没加载好，请稍等再试~";
            passwordInput.value = "";
            // 简单的震动效果
            document.querySelector('.login-box').style.transform = 'translateX(10px)';
            setTimeout(() => {
                document.querySelector('.login-box').style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    document.querySelector('.login-box').style.transform = 'translateX(0)';
                }, 100);
            }, 100);
        } finally {
            submitBtn.disabled = false;
        }
    }

    submitBtn.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    // 3. 信件展示逻辑
    function showLetterSection() {
        loginSection.classList.remove('active');
        letterSection.classList.add('active');

        // 稍微延迟一下，让背景先渐变出来，再展开信纸
        setTimeout(() => {
            letterPaper.classList.add('open');
            // 打字机效果显示文字
            typeWriter(letterContent, letterText, 50);
        }, 800);
    }

    // 打字机效果函数
    function typeWriter(text, element, speed) {
        let i = 0;
        element.textContent = '';
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
                // 自动滚动到底部
                const paper = document.querySelector('.letter-paper');
                paper.scrollTop = paper.scrollHeight;
            }
        }
        type();
    }

    async function loadPublicEncryptedAssets() {
        try {
            const [loginUrl, letterUrl, hintUrl] = await Promise.all([
                decryptImageUrl(ENCRYPTED_ASSETS.loginBackground, ASSET_PASSPHRASE),
                decryptImageUrl(ENCRYPTED_ASSETS.letterBackground, ASSET_PASSPHRASE),
                decryptImageUrl(ENCRYPTED_ASSETS.passwordHint, ASSET_PASSPHRASE)
            ]);

            loginBackground.style.backgroundImage = `url("${loginUrl}")`;
            letterBackground.style.backgroundImage = `url("${letterUrl}")`;
            hintImage.src = hintUrl;
            encryptedAssetsReady = true;
        } catch (error) {
            console.error('Error loading encrypted assets:', error);
            hintImage.alt = "提示加载失败，请用 HTTPS 重新打开页面";
            errorMsg.textContent = "图片资源加载失败，请刷新页面重试";
        }
    }

    async function decryptImageUrl(url, passphrase) {
        const resource = await decryptResource(url, passphrase);
        const objectUrl = URL.createObjectURL(new Blob([resource.bytes], { type: resource.mime || 'image/png' }));
        objectUrls.push(objectUrl);
        return objectUrl;
    }

    async function decryptResource(url, passphrase) {
        if (!window.crypto || !crypto.subtle) {
            throw new Error('当前页面不是安全上下文，请使用 HTTPS 打开');
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Unable to load ${url}`);

        const payload = await response.json();
        const key = await deriveKey(passphrase, base64ToBytes(payload.salt), payload.iterations);
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: base64ToBytes(payload.iv)
            },
            key,
            base64ToBytes(payload.ciphertext)
        );

        return {
            bytes: new Uint8Array(decrypted),
            mime: payload.mime || ''
        };
    }

    async function deriveKey(passphrase, salt, iterations) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
    }

    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    window.addEventListener('beforeunload', () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    });
});
