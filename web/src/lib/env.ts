export const getEnv = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_GOOGLE_CLIENT_ID'): string => {
  const localValue = localStorage.getItem(`APP_ENV_${key}`);
  if (localValue) return localValue;
  
  // @ts-ignore
  return import.meta.env[key] || '';
};

export const setEnv = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_GOOGLE_CLIENT_ID', value: string) => {
  if (value.trim() === '') {
    localStorage.removeItem(`APP_ENV_${key}`);
  } else {
    localStorage.setItem(`APP_ENV_${key}`, value.trim());
  }
};
