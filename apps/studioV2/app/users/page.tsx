/**
	* 玩家配置路由：只做装配；编辑引擎 User 身份字段，非调试器附属页。
	*/
import { UserLibraryView } from "@studio-v2/src/pageComponents/users/UserLibraryView";

export default function UsersPage() {
	// 引用了UserLibraryView组件，用于玩家配置页主界面装配
	return <UserLibraryView />;
}
