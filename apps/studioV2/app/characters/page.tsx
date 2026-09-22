/**
	* 角色库路由：只做装配。
	*/
import { CharacterLibraryView } from "@studio-v2/src/pageComponents/characters/CharacterLibraryView";

export default function CharactersPage() {
	// 引用了CharacterLibraryView组件，用于页面展示与交互
	return <CharacterLibraryView />;
}
