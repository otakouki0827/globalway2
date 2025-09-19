# GlobalWay2 - Salesforce LWC Project

このプロジェクトは、Salesforce Lightning Web Components (LWC) を使用して開発されたアプリケーションです。

## プロジェクト構造

```
force-app/
└── main/
    └── default/
        └── lwc/          # Lightning Web Components
```

## セットアップ

1. 依存関係をインストール:
   ```bash
   npm install
   ```

2. Salesforce CLIで認証:
   ```bash
   sfdx auth:web:login -d -a MyAlias
   ```

3. 開発サーバーを起動:
   ```bash
   sfdx force:lightning:lwc:start
   ```

## 利用可能なスクリプト

- `npm run lint` - ESLintでコードをチェック
- `npm run test` - 単体テストを実行
- `npm run test:unit:watch` - テストをウォッチモードで実行
- `npm run prettier` - コードをフォーマット

## 開発

新しいLWCコンポーネントを作成するには:

```bash
sfdx force:lightning:component:create --componentname myComponent --type lwc --outputdir force-app/main/default/lwc
```

## デプロイ

組織にデプロイするには:

```bash
sfdx force:source:deploy -p force-app/main/default/lwc
```
