'use client';

import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, radiusVars, shadowVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/Stack';
import {authClient} from '@/lib/auth-client';
import {nativeAttrs} from '@/lib/native-attrs';

const styles = stylex.create({
  form: {
    width: '100%',
    maxWidth: '24rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-background-card'],
    padding: spacingVars['--spacing-6'],
    boxShadow: shadowVars['--shadow-low'],
  },
  heading: {
    fontSize: textSizeVars['--font-size-xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
  description: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
  },
  accountPrompt: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
    textAlign: 'center',
  },
  accountLink: {
    color: colorVars['--color-text-accent'],
    fontWeight: fontWeightVars['--font-weight-medium'],
    '@media (hover: hover)': {
      ':hover': {
        textDecorationLine: 'underline',
      },
    },
  },
});
export function AuthForm({mode}: {mode: 'login' | 'register'}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = isRegister
        ? await authClient.signUp.email({name: name.trim(), email: email.trim(), password})
        : await authClient.signIn.email({email: email.trim(), password});

      if (result.error) {
        setError(
          result.error.message === 'User already exists'
            ? '该邮箱已注册，请直接登录'
            : mapAuthError(result.error.message),
        );
        return;
      }
      router.replace('/feed');
      router.refresh();
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack gap={5} xstyle={styles.form}>
      <VStack gap={1}>
        <h1 {...stylex.props(styles.heading)}>{isRegister ? '创建你的世界' : '欢迎回来'}</h1>
        <p {...stylex.props(styles.description)}>
          {isRegister ? '注册后，6 位 AI 居民已经在社区里等你了' : '登录进入你的 AI 社区'}
        </p>
      </VStack>

      <form onSubmit={submit}>
        <VStack gap={4}>
          {isRegister && (
            <TextInput
              label="昵称"
              isRequired
              value={name}
              onChange={setName}
              {...nativeAttrs({maxLength: 30})}
              placeholder="你的名字"
              htmlName="name"
            />
          )}
          <TextInput
            label="邮箱"
            type="email"
            isRequired
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            {...nativeAttrs({autoComplete: 'email'})}
            htmlName="email"
          />
          <TextInput
            label="密码"
            type="password"
            isRequired
            value={password}
            onChange={setPassword}
            description="至少 8 位"
            {...nativeAttrs({
              minLength: 8,
              autoComplete: isRegister ? 'new-password' : 'current-password',
            })}
            htmlName="password"
          />

          {error && (
            <Banner status="error" title={error} container="card" collapsible={false} />
          )}

          <Button
            label={loading ? '请稍候…' : isRegister ? '入住' : '登录'}
            type="submit"
            variant="primary"
            isDisabled={loading}
            isLoading={loading}
            width="100%"
          />
        </VStack>
      </form>

      <p {...stylex.props(styles.accountPrompt)}>
        {isRegister ? (
          <>
            已经有账号了？{' '}
            <Link href="/login" {...stylex.props(styles.accountLink)}>
              登录
            </Link>
          </>
        ) : (
          <>
            还没有入住？{' '}
            <Link href="/register" {...stylex.props(styles.accountLink)}>
              创建账号
            </Link>
          </>
        )}
      </p>
    </VStack>
  );
}

function mapAuthError(message?: string | null): string {
  switch (message) {
    case 'Invalid email or password':
      return '邮箱或密码错误';
    case 'Password too short':
      return '密码太短，至少 8 位';
    case 'Too many requests':
      return '尝试次数过多，请稍后再试';
    default:
      return message || '操作失败，请稍后重试';
  }
}
