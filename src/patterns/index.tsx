import { Resource } from "react-admin";
import { PatternCreate, PatternEdit } from "./Edit.tsx";
import PatternList from "./List.tsx";

const patternResource = (
  <Resource
    name="patterns"
    list={PatternList}
    edit={PatternEdit}
    create={PatternCreate}
  />
);

export default patternResource;
