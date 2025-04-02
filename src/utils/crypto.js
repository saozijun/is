import CryptoJS from "crypto-js";

const key = CryptoJS.enc.Utf8.parse("FET321FN44LHYRF9"); // 16字节密钥
const iv = CryptoJS.enc.Utf8.parse("d809fds09g79s8g7"); // 16字节IV

export default {
  // 加密
  encrypt(word) {
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(word), key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: iv,
    });
    return encrypted.toString();
  },

  // 解密
  decrypt(word) {
    const decrypted = CryptoJS.AES.decrypt(word, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: iv,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  },
  // 解码
  decodeUnicode(word) {
    return word.replace(/\\u[\dA-Fa-f]{4}/g, match => 
      String.fromCharCode(parseInt(match.replace("\\u", ""), 16))
    );
  },
  // 解码请求
  encodeData(word) {
    return this.decodeUnicode(this.decrypt(word));
  },
};
