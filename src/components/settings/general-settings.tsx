'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {Section} from '@astryxdesign/core/Section';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {nativeAttrs} from '@/lib/native-attrs';
import {updateProfile} from '@/server/actions/settings';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px'},
  backLink: {display: 'flex', width: '32px', height: '32px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', '@media (min-width: 1024px)': {display: 'none'}, ':hover': {backgroundColor: 'var(--color-background-muted)'}},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  subtitle: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  sectionTitle: {fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
});

export function GeneralSettings({
  profile,
}: {
  profile: {name: string; bio: string | null};
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    const res = await updateProfile({name, bio});
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('资料已保存');
    router.refresh();
  };

  return (
    <VStack gap={6}>
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>通用设置</h1>
          <p {...stylex.props(styles.subtitle)}>管理个人基础资料</p>
        </div>
      </div>
      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <VStack gap={0.5}>
            <h2 {...stylex.props(styles.sectionTitle)}>个人资料</h2>
          </VStack>
          <TextInput label="昵称" value={name} onChange={setName} {...nativeAttrs({maxLength: 50})} htmlName="profile-name" />
          <TextInput label="个性签名" isOptional value={bio} onChange={setBio} {...nativeAttrs({maxLength: 200})} htmlName="profile-bio" />
          <div>
            <Button label="保存资料" variant="primary" onClick={saveProfile} isDisabled={saving} isLoading={saving} />
          </div>
        </VStack>
      </Section>
    </VStack>
  );
}
