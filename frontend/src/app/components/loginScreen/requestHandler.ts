'use server';

export async function doRegister(name: string, email: string, password: string) {
  return new Promise((resolve) => {
    fetch('http://localhost:3010/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        email: email,
        password: password,
      }),
      headers: {
        'Content-Type': 'Application/json',
      }
    }).then((data) => data.json()).then((data) => {
      resolve(data);
    });
  });
}

export async function doLogin(email: string, password: string) {
  return new Promise((resolve) => {
    fetch('http://localhost:3010/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      headers: {
        'Content-Type': 'Application/json',
      }
    }).then((data) => data.json()).then((data) => {
      resolve(data);
    });
  });
}