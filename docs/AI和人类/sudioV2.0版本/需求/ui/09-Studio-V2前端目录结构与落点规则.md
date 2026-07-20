# Studio V2 前端目录结构与落点规则

> 本文是 Studio V2 前端目录结构的真源。  
> 目的不是追求抽象优雅，而是让人类、Cursor、批执行器和门禁脚本都能一眼判断：一个文件应该放在哪里，不应该放在哪里。

## 1. 为什么需要这份规则

Studio V2 第一阶段是静态页重构，不要求真实保存、真实调试或真实导入导出闭环。

但静态阶段也必须保证代码地基不歪。如果目录边界不清晰，AI 会自然出现以下退化：

- 先平铺文件，再为了过门禁移动到子目录。
- 移动后保留兼容转发文件，导致父目录和子目录长期并存。
- `features`、`domain`、`services` 被不同执行者解释成不同含义。
- 页面组件、业务编排、mock 数据、类型契约混在一起。
- 后续真实功能接入时，只能在已经歪掉的结构上继续堆。

因此 Studio V2 从此只认固定目录结构。任何新增、迁移、修复任务都必须先判断目标文件属于哪一类，再落到对应目录。

## 2. 顶层结构

Studio V2 前端只认以下顶层业务目录：

```text
apps/studioV2/
  app/
  src/
  typeFiles/
  tests/
```

其它顶层业务目录默认禁止。

允许的工程目录包括：

```text
apps/studioV2/
  public/
  scripts/
```

构建产物、缓存和依赖目录不得进入业务审查视野：

```text
apps/studioV2/.next/
apps/studioV2/node_modules/
apps/studioV2/*.tsbuildinfo
```

## 3. app

`app/` 只放 Next.js 路由入口、layout、全局样式和 route handler。

允许：

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `route.ts`
- `globals.scss`

不允许：

- 页面主体 JSX。
- 页面私有组件。
- 请求编排。
- 状态转换。
- 画布命令。
- mock 数据。
- 类型契约。

`page.tsx` 只能导入对应的页面组件并传递路由参数。

## 4. src

`src/` 是 Studio V2 前端实现主体，按文件用途分类，不按抽象概念自由发挥。

```text
src/
  pageComponents/
  commonUiComponents/
  bis/
  stores/
  utils/
```

### 4.1 pageComponents

`src/pageComponents/` 放页面主组件、页面私有组件、页面私有 hooks 和页面样式。

目录按 `app/` 路由分类：

```text
src/pageComponents/
  home/
    index.tsx
    index.scss
    com/
    hooks/
  stories/
    index.tsx
    index.scss
    com/
    hooks/
  debugger/
    index.tsx
    index.scss
    com/
    hooks/
```

规则：

- `index.tsx` 是该页面主组件，不是 barrel。
- `index.scss` 是该页面主样式。
- `com/` 放页面私有展示组件。
- `hooks/` 放页面私有 hooks。
- 页面私有组件不得被其它页面直接 import。
- 多页面复用的展示组件必须进入 `src/commonUiComponents/`（见 §4.5）；单页私有组件仍放本页 `com/`。

### 4.2 bis

`src/bis/` 放页面和组件背后的业务编排层。

它不是 UI 展示层，也不是类型目录。它负责把用户动作、请求、store、mock 或后续 BFF 能力组织成页面可消费的状态和命令。

```text
src/bis/
  pageBis/
    home/
      home_bis.ts
      com/
    debugger/
      debugger_bis.ts
      com/
  shellBis/
    studio_shell_bis.ts
```

规则：

- 页面级编排进 `pageBis/<page>/<page>_bis.ts`。
- 页面内复杂组件编排进 `pageBis/<page>/com/<component>_bis.ts`。
- 全局壳编排进 `shellBis/`。
- JSX 不进入 bis。
- bis 可以导入 `typeFiles/`、`src/stores/`、`src/utils/`。
- bis 不直接深挖引擎内部路径；真实写口后续只能经 Next / BFF 门面。

### 4.3 stores

`src/stores/` 放前端状态容器。

规则：

- store 只保存前端会话状态、UI 偏好、当前选择、临时草稿。
- store 不是真实 Profile、StorySave、Memory 或 StoryPackage 真源。
- store 不直接读写磁盘。
- store 不直接导入引擎写口。

### 4.4 utils

`src/utils/` 放真正跨页面复用的工具。

```text
src/utils/
  ajaxProxy/
  ajaxHelper/
  hooks/
  helper/
  config.ts
  utils.ts
```

规则：

- `ajaxProxy/`：按模块拆分的请求纯函数，例如故事包、资源、调试器。
- `ajaxHelper/`：请求器、错误归一、响应解析等基础设施。
- `hooks/`：全局复用 hooks。
- `helper/`：全局纯函数，按主题拆文件。
- `config.ts`：环境变量和运行配置唯一出口。
- `utils.ts`：只允许少量无业务含义的全局小函数；一旦变长必须拆入 `helper/`。

`utils/` 不是垃圾桶。任何带业务语义的东西必须优先进入页面 bis、页面组件目录或 `typeFiles/`。

### 4.5 commonUiComponents

`src/commonUiComponents/` 放跨页面复用的 **展示型 UI**（Modal、表单字段、分页等）。

路径与建议结构（第二步横切真源）：

```text
src/commonUiComponents/
  modal/
    app/AppModal/
      index.tsx
      index.module.scss
      com/
      images/
    form/FormModal/
      index.tsx
      index.module.scss
      com/
      images/
    confirm/DeleteConfirmModal/
      index.tsx
      index.module.scss
      com/
      images/
    shared/modalTypes.ts
    shared/modalSlot.ts
  form/
    AutoForm/
      index.tsx
      index.module.scss
      comsMap.ts
      com/
      images/
    FormFieldShell/
      index.tsx
      index.module.scss
      com/
      images/
    autoFormTypes.ts
    formTypes.ts
    fields/
      FormTextField/
        index.tsx
  pagination/
    FrontendPagination/
      index.tsx
      index.module.scss
```

规则：

- **抽离条件：** 同一展示组件被 **≥2 个业务页面**（不同 `pageComponents/<route>/`）使用时，必须抽到本目录；禁止在各业务页复制粘贴 Modal / 表单字段 / 分页条。
- 单页私有组件仍放 `pageComponents/<route>/com/`，不要为“可能复用”提前空抽。
- 本目录 **禁止** barrel `index.ts`；调用方直引具体文件。
- 公共 UI 组件必须是“组件目录单元”：`ComponentName/index.tsx` + 可选 `index.module.scss`、`com/`、`images/`、`hooks/`。
- 禁止 `ComponentName.tsx` 与 `ComponentName.module.scss` 平铺在组件分类目录下。纯类型、纯 helper、配置文件可以继续是普通文件，例如 `formTypes.ts`、`sliceForPage.ts`。
- **禁止**业务编排、mock 请求、store 写入进入本目录（编排进 `bis/`，状态进 `stores/`，契约进 `typeFiles/`）。
- 表单统一 Formik + AutoForm（`items[]` + ComsMap + 按 name 自动绑；`comProps` / `children` 双逃生口）；字段外壳为 label + 控件 + 错误 + mode(add/edit/watch)。
- 禁止再引入已删除的 FormSchemaRenderer / `kind` 双轨配置。
- 用户可见文案全中文；内部 id 由系统生成，不在公共表单里手填。

## 5. typeFiles

`typeFiles/` 替代旧 `domain/`。

它只放类型、DTO、枚举、静态标签映射和契约说明，不放页面 JSX，不放请求，不放 store，不放复杂业务编排。

推荐结构：

```text
typeFiles/
  ids/
  story/
    summary/
    editor/
    transfer/
  debugger/
  library/
    characters/
    assets/
    users/
    labels/
  settings/
  theme/
```

规则：

- 类型契约必须写清所有权、生命周期、单位、可空语义和是否持久化。
- UI 投影类型应说明“仅用于 Studio 投影，不是引擎真源”。
- 静态标签映射可以放在 `typeFiles/*/labels/`。
- mock 数据不放 `typeFiles/`。
- 会发请求、读写状态或包含流程编排的函数不放 `typeFiles/`。

## 6. 禁止旧结构

Studio V2 不再新增以下目录：

```text
features/
domain/
services/
commands/
store/
```

迁移期间必须一次性改 import，禁止保留兼容转发壳。

禁止以下文件形态：

```ts
/** @deprecated 已迁至 ... */
export { X } from "...";
```

```ts
/**
 * 兼容转发：...
 */
export type { X } from "...";
```

V2 是新项目，不建立“旧路径兼容期”。如果路径变更，调用方必须同步改到新路径。

## 7. index 文件规则

允许：

- `src/pageComponents/<page>/index.tsx`：页面主组件。
- `src/pageComponents/<page>/index.scss`：页面主样式。

禁止：

- `com/index.ts`
- `hooks/index.ts`
- `typeFiles/**/index.ts`
- `src/utils/**/index.ts`
- 任何仅用于 re-export 的 barrel。

## 8. 同名重复规则

同一语义文件不得在父目录和子目录同时存在。

禁止：

```text
src/pageComponents/debugger/CallRunPanel.tsx
src/pageComponents/debugger/com/CallRunPanel.tsx
```

禁止：

```text
typeFiles/story/storyPackageSummary.ts
typeFiles/story/summary/storyPackageSummary.ts
```

如果需要移动文件，必须同步更新 import 并删除旧文件。

## 9. 静态页阶段的允许与不允许

允许：

- 使用 mock 数据。
- 使用本地 React 状态模拟选中、展开、筛选和浮窗开关。
- 使用 disabled 按钮表达后续功能。
- 用静态投影展示未来流程。

不允许：

- 假装已经接入真实 Host / Engine 写口。
- 为了“看起来能用”把保存、导入导出、调试运行写成伪闭环。
- 把静态内容写成大段说明文页面，脱离未来真实操作流程。
- 把 mock 数据散落在页面组件中，导致未来难以替换为真实 BFF。

## 10. 调试器静态形态要求

调试器第一版可以是静态页，但信息架构必须像运行台，而不是说明文。

主流程应围绕：

```text
场景输入 -> 本轮通话 -> 用户事件 -> 出口命中 -> Effect 执行 -> 角色挂卡变化
```

每个区域都可以用 mock，但必须表达未来真实调试时的状态推进关系。

## 11. 门禁要求

`quality:studio` 必须逐步具备以下检查：

- 禁止旧式顶层业务目录。
- 禁止兼容转发和 deprecated 迁移壳。
- 禁止 barrel `index.ts`。
- 禁止同名父子重复入口。
- 禁止 `typeFiles/` 中出现 JSX、请求或 store 写入。
- 禁止 `app/` 承载页面主体。
- 禁止跨页复用的展示组件滞留在某页 `com/`（对照 §4.5：≥2 业务页须进 `commonUiComponents`）。
- 排除构建产物、缓存和依赖目录。

### 11.1 新增/修改代码入口格式门禁

为避免 V2 后续继续出现“代码能跑但入口不明白”的问题，新增或修改的 Studio V2 代码文件必须满足以下规则。  
当前已有文件以 `studio-v2-entry-style-baseline.json` 为历史边界；未来只要新增文件，或修改了 baseline 内文件，就必须按新规通过门禁。

规则：

- 所有新增或修改的代码文件使用 tab 缩进，禁止行首空格缩进。
- TSX 中引用自定义组件时，引用上方必须有一行用途注释。
- 普通 TS/TSX 代码块中写：`// 引用了XXX组件，用于XXX`。
- JSX 树中写：`{/* 引用了XXX组件，用于XXX */}`。
- React 组件的 props 必须在参数入口显式解构，禁止先接 `props` 再在函数体内解构。
- props 解构里的每个字段上方必须有一行说明注释，说明“这是什么，用于什么”。

推荐写法：

```tsx
type AutoFormProps<TValues> = {
	formik: FormikProps<TValues>;
	mode: FormFieldMode;
	items: AutoFormItem[];
};

export function AutoForm<TValues>({
	// formik 是表单状态对象，用于读取字段值和提交状态
	formik,
	// mode 是表单模式，用于决定字段可编辑或只读
	mode,
	// items 是声明式字段列表，用于按 comType 渲染
	items,
}: AutoFormProps<TValues>): ReactElement {
	return (
		<section>
			{/* 引用了FormSelectField组件，用于渲染下拉选择字段 */}
			<FormSelectField name={items[0].name} formik={formik} mode={mode} />
		</section>
	);
}
```

禁止写法：

```tsx
export function AutoForm<TValues>(
	props: AutoFormProps<TValues>,
): ReactElement {
	const { formik, mode, items } = props;
	return <FormSelectField name={items[0].name} formik={formik} mode={mode} />;
}
```

门禁无法判断的产品语义，由 Reviewer 对照本文进行结构审查。

## 12. 总结

Studio V2 的目录规则只有一个目标：让代码按用途自然归位。

`app` 管路由，`src/pageComponents` 管页面形态，`src/commonUiComponents` 管跨页展示复用，`src/bis` 管编排，`src/stores` 管前端状态，`src/utils` 管公共工具，`typeFiles` 管类型契约。  
除此之外的自由发挥，都会在功能接入阶段变成维护成本。
