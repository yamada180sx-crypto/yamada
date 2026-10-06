import { firebaseConfig } from './firebase-config.js';

export function connectAccount({ onReset, onRecords }) {
  const message = document.getElementById('accountMessage');
  const login = document.getElementById('loginButton');
  const logout = document.getElementById('logoutButton');
  const setAccess = allowed => {
    document.getElementById('studyContent').hidden = !allowed;
    document.getElementById('studyNav').hidden = !allowed;
  };
  setAccess(false);

  const account = {
    ready: false,
    addEvent: async () => {
      throw new Error('Not signed in');
    }
  };

  const show = text => {
    message.textContent = text;
  };

  const errorText = error => ({
    'auth/popup-blocked':
      'ログイン画面がブロックされました。ポップアップを許可して再度お試しください。',
    'auth/popup-closed-by-user':
      'ログインをキャンセルしました。',
    'auth/cancelled-popup-request':
      'ログイン画面を確認してください。',
    'auth/unauthorized-domain':
      'このサイトのログイン設定がまだ完了していません。',
    'auth/operation-not-allowed':
      'Googleログインがまだ有効になっていません。',
    'auth/network-request-failed':
      '接続できません。通信環境を確認してください。',
    'permission-denied':
      'このアカウントには利用許可がありません。管理者に確認してください。',
    'unavailable':
      '接続できません。通信環境を確認してください。'
  }[error.code] ||
    '処理できませんでした。通信環境や設定を確認して再度お試しください。');

  if (
    !firebaseConfig?.apiKey ||
    !firebaseConfig?.projectId ||
    !firebaseConfig?.authDomain
  ) {
    show('ログイン設定の準備中です。管理者が設定を完了するまでお待ちください。');
    return account;
  }

  let generation = 0;
  let unsubscribe = null;
  let user = null;
  let pending = 0;
  let hasWriteError = false;

  const reset = () => {
    generation++;
    account.ready = false;
    setAccess(false);
    user = null;
    pending = 0;
    hasWriteError = false;
    unsubscribe?.();
    unsubscribe = null;
    onReset();
  };

  const renderStatus = (offline = false) => {
    if (!user) return;
    const name = user.displayName || 'あなた';

    show(
      hasWriteError
        ? '保存できなかった記録があります。解いた問題を再度お試しください。'
        : pending
          ? '学習記録を保存しています…'
          : offline
            ? `${name}の学習ノート · オフラインです。接続後に同期します。`
            : `${name}の学習ノート · 同期済み`
    );
  };

  (async () => {
    try {
      const [app, authSdk, dbSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
      ]);

      const firebaseApp = app.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(firebaseApp);
      const db = dbSdk.getFirestore(firebaseApp);

      await authSdk.setPersistence(
        auth,
        authSdk.browserSessionPersistence
      );

      login.disabled = false;

      login.onclick = async () => {
        login.disabled = true;
        const provider = new authSdk.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
          await authSdk.signInWithPopup(auth, provider);
        } catch (error) {
          show(errorText(error));
        } finally {
          login.disabled = false;
        }
      };

      logout.onclick = async () => {
        logout.disabled = true;
        try {
          await authSdk.signOut(auth);
        } catch (error) {
          show(errorText(error));
        } finally {
          logout.disabled = false;
        }
      };

      account.addEvent = async event => {
        if (!account.ready || !user) {
          throw new Error('Not signed in');
        }

        const current = generation;
        const uid = user.uid;
        pending++;
        renderStatus();

        try {
          await dbSdk.addDoc(
            dbSdk.collection(db, 'users', uid, 'events'),
            {
              ...event,
              createdAt: dbSdk.serverTimestamp()
            }
          );
        } catch (error) {
          if (current === generation) {
            hasWriteError = true;
            show('学習記録を保存できませんでした。' + errorText(error));
          }
          throw error;
        } finally {
          if (current === generation) {
            pending--;
            if (!hasWriteError) renderStatus();
          }
        }
      };

      authSdk.onAuthStateChanged(
        auth,
        async nextUser => {
          reset();
          const current = generation;
          login.hidden = !!nextUser;
          logout.hidden = !nextUser;

          if (!nextUser) {
            show('Googleでログインして、勉強を始めましょう。');
            return;
          }

          show('利用許可と学習記録を確認しています…');

          try {
            const allowed = await dbSdk.getDocFromServer(
              dbSdk.doc(db, 'allowedUsers', nextUser.uid)
            );

            if (current !== generation) return;

            if (!allowed.exists()) {
              await authSdk.signOut(auth);
              show('このアカウントには利用許可がありません。管理者に確認してください。');
              return;
            }

            user = nextUser;

            unsubscribe = dbSdk.onSnapshot(
              dbSdk.collection(db, 'users', user.uid, 'events'),
              { includeMetadataChanges: true },
              snapshot => {
                if (current !== generation) return;
                onRecords(snapshot.docs.map(doc => doc.data()));
                account.ready = true;
                setAccess(true);
                renderStatus(snapshot.metadata.fromCache);
              },
              error => {
                if (current !== generation) return;
                account.ready = false;
                setAccess(false);
                onReset();
                show(errorText(error));
              }
            );
          } catch (error) {
            if (current === generation) {
              account.ready = false;
              show(
                errorText(error) +
                ' ログアウトしてから再度お試しください。'
              );
            }
          }
        },
        error => {
          reset();
          show(errorText(error));
        }
      );
    } catch (error) {
      login.disabled = true;
      show('ログインを準備できませんでした。通信環境や管理者の設定を確認してください。');
    }
  })();

  return account;
}
