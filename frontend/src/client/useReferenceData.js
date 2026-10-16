// client/useReferenceData.js — pays et moyens de paiement actifs (mis en cache)
import { useEffect, useState } from "react";
import clientApi from "./api";

let cache = null;
let pending = null;

const load = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.all([clientApi.get("countries"), clientApi.get("payment-methods")])
      .then(([countriesRes, methodsRes]) => {
        const countries = countriesRes.data.data || [];
        const methods = methodsRes.data.data || [];
        cache = {
          countries,
          methods,
          countryById: Object.fromEntries(countries.map((c) => [c.id, c])),
          methodsByCountry: methods.reduce((acc, m) => {
            (acc[m.country_id] ||= []).push(m);
            return acc;
          }, {}),
        };
        return cache;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

export default function useReferenceData() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError("Impossible de charger les pays"));
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading: !data && !error, error };
}
