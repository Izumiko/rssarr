import jsonServerProvider from "ra-data-json-server";
import { fetchUtils } from 'react-admin';
import type { Options } from 'ra-core';

const httpClient = (url: string, options = {} as Options) => {
    if (!options.headers) {
        options.headers = new Headers();
    } else if (!(options.headers instanceof Headers)) {
        options.headers = new Headers(options.headers);
    }
    options.headers.set('Authorization', `Bearer ${localStorage.getItem('token')}`);
    return fetchUtils.fetchJson(url, options);
};

const dataProvider = jsonServerProvider(new URL("api", location.href).href, httpClient);

export default dataProvider;
