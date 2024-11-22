import { Resource } from "react-admin"
import SettingsIcon from '@mui/icons-material/Settings'
import {SettingEdit, SettingsList} from './SettingEdit.tsx'

export const settingsResource = (
    <Resource
        name="settings"
        options={{ label: 'Settings' }}
        icon={SettingsIcon}
        edit={SettingEdit}
        list={SettingsList}
    />
)

export default settingsResource