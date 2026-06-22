import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';

// 简单 .env.local 解析（避免引 dotenv 包）
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const ak = process.env.KLING_API_KEY || '';
const sk = process.env.KLING_SECRET_KEY || '';
const now = Math.floor(Date.now() / 1000);

const payload = { iss: ak, exp: now + 1800, nbf: now - 5 };
const token = jwt.sign(payload, sk, {
  algorithm: 'HS256',
  header: { alg: 'HS256', typ: 'JWT' },
});

const decoded = jwt.verify(token, sk);

console.log(JSON.stringify({
  ak_len: ak.length,
  ak_first8_chars: [...ak.slice(0, 8)].map(c => c.charCodeAt(0).toString(16)).join(','),
  ak_last8_chars: [...ak.slice(-8)].map(c => c.charCodeAt(0).toString(16)).join(','),
  sk_len: sk.length,
  sk_first8_chars: [...sk.slice(0, 8)].map(c => c.charCodeAt(0).toString(16)).join(','),
  sk_last8_chars: [...sk.slice(-8)].map(c => c.charCodeAt(0).toString(16)).join(','),
  token_parts: token.split('.').length,
  token_total_len: token.length,
  token_first80: token.slice(0, 80),
  decoded_iss_equals_ak: decoded.iss === ak,
  decoded_iss_len: decoded.iss.length,
  decoded_exp_diff_from_now: decoded.exp - now,
  decoded_nbf: decoded.nbf,
  now,
}, null, 2));
