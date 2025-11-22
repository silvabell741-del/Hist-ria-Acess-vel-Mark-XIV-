import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SpinnerIcon } from '../constants/index';

const Logo: React.FC = () => (
    <div className="flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
            <span className="text-5xl" role="img" aria-label="Logo da História Acessível">🎓</span>
        </div>
    </div>
);

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" aria-hidden="true" focusable="false" viewBox="0 0 48 48">
        <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#FBBC05" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#EA4335" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.612 34.869 44 30.131 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const EyeIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .946-3.11 3.52-5.445 6.44-6.41M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.05 2.05L21.95 21.95" /></svg>;


export const LoginPage: React.FC<{ initialError?: string | null }> = ({ initialError }) => {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);
    const [message, setMessage] = useState<string | null>(null);

    const clearState = () => {
        setError(null);
        setMessage(null);
    }
    
    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearState();
        try {
            await signInWithEmail(email, password);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearState();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }
        if (!name.trim()) {
            setError('Por favor, insira seu nome completo.');
            setLoading(false);
            return;
        }

        try {
            await signUpWithEmail(name.trim(), email, password);
            setMessage("Cadastro realizado! Por favor, verifique seu email para confirmar sua conta antes de fazer login.");
            setIsSignUp(false);
            setName('');
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
             setError(err.message);
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        clearState();
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <Logo />
                    <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white hc-text-override">
                        {isSignUp ? 'Crie sua Conta' : 'Bem-vindo ao História Acessível'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 hc-text-secondary">
                        {isSignUp ? 'Comece sua jornada de aprendizado' : 'Faça login para continuar'}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hc-bg-override hc-border-override">
                    <div className="space-y-6">
                        {error && <p className="text-red-500 text-sm text-center" role="alert">{error}</p>}
                        {message && <p className="text-green-600 dark:text-green-400 text-sm text-center" role="status">{message}</p>}
                        
                        {!isSignUp && (
                            <button
                                onClick={handleGoogleSignIn}
                                type="button"
                                disabled={loading}
                                className="w-full flex items-center justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-base font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override disabled:opacity-50"
                            >
                                <GoogleIcon />
                                <span className="ml-3">Continuar com Google</span>
                            </button>
                        )}
                        
                        {!isSignUp && (
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                        OU
                                    </span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                            {isSignUp && (
                                 <div>
                                    <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                                        Nome Completo
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="Seu nome"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                                    Email
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        placeholder="you@example.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password"  className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                                    Senha
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 sm:text-sm border-slate-300 rounded-md py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-500" aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}>
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                             {isSignUp && (
                                <div>
                                    <label htmlFor="confirmPassword"  className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                                        Confirmar Senha
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 sm:text-sm border-slate-300 rounded-md py-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="••••••••"
                                            required
                                            disabled={loading}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-500" aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}>
                                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 hc-button-primary-override disabled:opacity-50"
                            >
                                {loading ? <SpinnerIcon /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="mt-6 text-center text-sm">
                    <button
                        onClick={() => {
                            setIsSignUp(prev => {
                                if (prev) { // if it WAS sign up, now it's sign in
                                    setName('');
                                    setConfirmPassword('');
                                }
                                return !prev;
                            });
                            clearState();
                        }}
                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 hc-link-override"
                    >
                        {isSignUp
                            ? 'Já tem uma conta? Entrar'
                            : 'Não tem uma conta? Cadastre-se'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};