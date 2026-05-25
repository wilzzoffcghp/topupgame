// lib/github-db.js
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // format: "username/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const BASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/db`;

const headers = {
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github.v3+json'
};

async function getFile(filename) {
  try {
    const res = await fetch(`${BASE_URL}/${filename}`, { headers });
    if (res.status === 404) return { data: [], sha: null };
    const json = await res.json();
    const content = Buffer.from(json.content, 'base64').toString('utf8');
    return { data: JSON.parse(content), sha: json.sha };
  } catch (e) {
    return { data: [], sha: null };
  }
}

async function saveFile(filename, data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = {
    message: `Update ${filename}`,
    content,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${BASE_URL}/${filename}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  return res.json();
}

// Users DB
async function getUsers() { return getFile('users.json'); }
async function saveUsers(data, sha) { return saveFile('users.json', data, sha); }

async function getUserByEmail(email) {
  const { data, sha } = await getUsers();
  const users = Array.isArray(data) ? data : [];
  return { user: users.find(u => u.email === email), users, sha };
}

async function getUserByUsername(username) {
  const { data, sha } = await getUsers();
  const users = Array.isArray(data) ? data : [];
  return { user: users.find(u => u.username === username), users, sha };
}

async function createUser(userData) {
  const { data, sha } = await getUsers();
  const users = Array.isArray(data) ? data : [];
  users.push(userData);
  await saveUsers(users, sha);
  return userData;
}

async function updateUser(email, updates) {
  const { data, sha } = await getUsers();
  const users = Array.isArray(data) ? data : [];
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  await saveUsers(users, sha);
  return users[idx];
}

// Transactions DB
async function getTransactions() { return getFile('transactions.json'); }

async function createTransaction(txData) {
  const { data, sha } = await getTransactions();
  const txs = Array.isArray(data) ? data : [];
  txs.push(txData);
  await saveFile('transactions.json', txs, sha);
  return txData;
}

async function getTransactionsByUser(userId) {
  const { data } = await getTransactions();
  const txs = Array.isArray(data) ? data : [];
  return txs.filter(t => t.user_id === userId);
}

async function updateTransaction(orderId, updates) {
  const { data, sha } = await getTransactions();
  const txs = Array.isArray(data) ? data : [];
  const idx = txs.findIndex(t => t.order_id === orderId);
  if (idx === -1) return null;
  txs[idx] = { ...txs[idx], ...updates };
  await saveFile('transactions.json', txs, sha);
  return txs[idx];
}

// Deposits DB
async function getDeposits() { return getFile('deposits.json'); }

async function createDeposit(depositData) {
  const { data, sha } = await getDeposits();
  const deps = Array.isArray(data) ? data : [];
  deps.push(depositData);
  await saveFile('deposits.json', deps, sha);
  return depositData;
}

async function updateDeposit(depositId, updates) {
  const { data, sha } = await getDeposits();
  const deps = Array.isArray(data) ? data : [];
  const idx = deps.findIndex(d => d.deposit_id === depositId);
  if (idx === -1) return null;
  deps[idx] = { ...deps[idx], ...updates };
  await saveFile('deposits.json', deps, sha);
  return deps[idx];
}

async function getDepositById(depositId) {
  const { data } = await getDeposits();
  const deps = Array.isArray(data) ? data : [];
  return deps.find(d => d.deposit_id === depositId);
}

// Resellers DB
async function getResellers() { return getFile('resellers.json'); }

async function createReseller(resellerData) {
  const { data, sha } = await getResellers();
  const rs = Array.isArray(data) ? data : [];
  rs.push(resellerData);
  await saveFile('resellers.json', rs, sha);
  return resellerData;
}

async function getResellerByUserId(userId) {
  const { data } = await getResellers();
  const rs = Array.isArray(data) ? data : [];
  return rs.find(r => r.user_id === userId);
}

async function getResellerByApiKey(apiKey) {
  const { data } = await getResellers();
  const rs = Array.isArray(data) ? data : [];
  return rs.find(r => r.api_key === apiKey);
}

module.exports = {
  getUsers, saveUsers, getUserByEmail, getUserByUsername, createUser, updateUser,
  getTransactions, createTransaction, getTransactionsByUser, updateTransaction,
  getDeposits, createDeposit, updateDeposit, getDepositById,
  getResellers, createReseller, getResellerByUserId, getResellerByApiKey
};
