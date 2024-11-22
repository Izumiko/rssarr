import { Datagrid, List, Pagination, TextField, Filter, TextInput, ListProps } from "react-admin";

const PatternFilters = () => (
  <Filter>
    <TextInput label='Search' source='q' alwaysOn />
  </Filter>
);

const PatternPagination = (props: any) => (
  <Pagination rowsPerPageOptions={[30, 50, 100]} {...props} />
);

const PatternList = (props: ListProps) => (
  <List
    sort={{
      field: "id",
      order: "DESC",
    }}
    filters={PatternFilters()}
    {...props}
    pagination={<PatternPagination />}
    perPage={30}
  >
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="series" />
      <TextField source="season" />
      <TextField source="language" />
      <TextField source="quality" />
    </Datagrid>
  </List>
);

export default PatternList;
