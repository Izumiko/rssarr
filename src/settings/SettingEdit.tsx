import {
  List,
  ListProps,
  Datagrid,
  Edit,
  EditProps,
  SimpleForm,
  TextField,
  TextInput,
  Toolbar,
  SaveButton,
} from 'react-admin'

const SettingEdit = (props: EditProps) => {
  const toolbar = () => (
    <Toolbar>
      <SaveButton />
    </Toolbar>
  )
  return (
    <Edit {...props}>
      <SimpleForm toolbar={toolbar()}>
        <TextInput disabled source="id" />
        <TextInput source="value" fullWidth />
      </SimpleForm>
    </Edit>
  )
}

const SettingsList = (props: ListProps) => (
  <List {...props}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="id" label="Setting" sortable={false} />
      <TextField source="value" label="Value" sortable={false} />
    </Datagrid>
  </List>
)

export { SettingsList, SettingEdit }
