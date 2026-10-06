# Googleログインの設定（GitHub Pages + Firebase）

アプリのHTMLと問題は公開されたままです。学習記録へのアクセスはFirebase AuthenticationとFirestoreのルールで制限します。許可リストに登録されたユーザーのみ学習できます。

## 1. FirebaseプロジェクトとWebアプリ

1. https://console.firebase.google.com/ でプロジェクトを作成。Google Analyticsは不要です。無料のSparkプランで始められます。
2. プロジェクトの概要でWebアプリ（`</>`）を追加。「Firebase Hosting」は不要です。
3. 表示される `firebaseConfig` のオブジェクトをコピーし、`firebase-config.js` の `null` を置き換えてください。
4. この設定はブラウザ公開用です。サービスアカウント秘密鍵やGoogleアカウントのパスワードはファイルに入れないでください。

## 2. Googleログイン

1. Build → Authentication → Get started。
2. Sign-in method → Googleを有効にし、サポート用メールアドレスを選んで保存。
3. Authentication → Settings → Authorized domainsに `yamada180sx-crypto.github.io` を追加。URLの `https://` や `/yamada/` は入れません。
4. Family Linkなどのアカウント制限でサインインできない場合は、Googleの制限を確認するか別の認証方式を検討してください。

## 3. Firestoreとアクセス制限

1. Build → Firestore Database → Create database。データベースIDは `(default)`、本番モード（Production mode）を選択。日本で利用するならTokyoのロケーションを選択できます。
2. Rulesタブに、このリポジトリの `firestore.rules` の全文を貼り付けてPublish。テストモードの全員許可ルールにはしないでください。
3. `allowedUsers/{uid}` が存在する本人のみ、`users/{uid}/events` の自分の記録を読み取り・追加できます。他人の記録、未ログインのアクセス、許可リストのアプリからの変更は禁止です。ルールをアップロードするだけではFirebaseに適用されません。必ずRulesでPublishしてください。

## 4. アプリの更新と娘さんの利用許可

1. GitHubの `main` の同じ階層に `index.html`, `style.css`, `app.js`, `auth.js`, `firebase-config.js` をアップロード・コミット。既存の3ファイルは上書き更新が必要です。
2. GitHub Pagesの公開完了後、娘さんのGoogleアカウントで一度ログインします。まだ利用許可がないためアプリは拒否しますが、AuthenticationのUsers一覧にアカウントが登録されます。
3. Firebase Console → Authentication → Usersで、娘さんのユーザーUIDをコピー。
4. Firestore → Data → Start collection。コレクションID `allowedUsers`、ドキュメントIDにコピーしたUIDを指定。フィールド `enabled` をbooleanの `true` として追加し保存（現在のルールはフィールド値ではなくドキュメントの存在で許可します）。
5. 娘さんが再度ログインすると学習できます。保護者も使う場合は同じ手順でそのUIDを追加。許可を取り消す場合は該当ドキュメントを削除します。

## 5. 公開後に必要な動作確認

- 未ログインでは演習・タイマーを開始できない。
- 許可したGoogleアカウントでログインして問題を解く。画面に「同期済み」が表示される。
- 同じアカウントで別の端末にログインすると、その記録が表示される。
- ログアウトすると記録が画面から消え、演習とタイマーが停止する。
- 許可していないアカウントで学習できない。
- Firebase Rules Playgroundで、未認証や別UIDによる `users/<娘のUID>/events/<記録ID>` のgetが拒否され、許可された本人のgetが許可されることを確認。

Firebase Web設定は入力済みです。ユーザー提供の画面で公開サイトの保護者ログインと記録の表示を確認しました。新しい愛知県対策の記録保存、別端末への同期と本番ルールによる他ユーザー拒否は未検証です。モックによる画面・処理の検証は実サービスの検証を代替しません。

## 記録とセッション

これまでのlocalStorage記録は削除しませんが、新しいアカウントへの自動取り込みは行いません。共有端末の記録を誤って娘さんのものとして登録しないためです。新しい記録はFirebaseに保存します。

ログインはタブのセッション内で保持します。共有端末では利用後にログアウトしてください。記録には日付、教科、正誤、集中時間と保存日時を保存します。タイマー自体は端末間で同期せず、ページを閉じるとリセットされます。

Firestoreの無料枠には上限があります。Consoleで利用状況を確認してください。現在は全記録を購読するため、記録が大量になった段階で集計方式を見直してください。
