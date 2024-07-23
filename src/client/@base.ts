import axios from 'axios';
import QueryString from 'qs';

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_ENDPOINT + '/admin',
  headers: {
    // "Content-Type": "application/json",
  },
  paramsSerializer: (params) => {
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== null));

    return QueryString.stringify(filteredParams, { arrayFormat: 'repeat' });
  },
});

export default client;
