export type UUID = string
export type ISODateTime = string

export type NamingStrategy = 'salesforce-first' | 'business-first' | 'hybrid'
export type SolutionStatus = 'discovery' | 'draft' | 'review' | 'ready' | 'archived'
export type ObjectKind =
  'standard' | 'custom' | 'external' | 'big-object' | 'platform-event' | 'custom-metadata-type'

export type FieldDataType =
  | 'auto-number'
  | 'checkbox'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'email'
  | 'formula'
  | 'geolocation'
  | 'external-lookup'
  | 'indirect-lookup'
  | 'lookup'
  | 'master-detail'
  | 'multi-select-picklist'
  | 'number'
  | 'percent'
  | 'phone'
  | 'picklist'
  | 'rich-text'
  | 'text'
  | 'text-area'
  | 'long-text-area'
  | 'time'
  | 'url'

export interface BlueprintFile {
  format: 'blueprint-studio'
  schemaVersion: string
  applicationVersion: string
  project: Project
  solutions: Solution[]
  settings: ProjectSettings
  templates: TemplateDefinition[]
  audit: AuditInfo
  extensions: Record<string, unknown>
}

export interface Project {
  id: UUID
  name: string
  description?: string
  organization?: string
  businessUnit?: string
  clouds: string[]
  status: 'active' | 'archived'
  tags: string[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ProjectSettings {
  namingStrategy: NamingStrategy
  autoGenerateApiNames: boolean
  healthRules: HealthRule[]
}

export interface Solution {
  id: UUID
  projectId: UUID
  name: string
  description?: string
  versions: SolutionVersion[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface SolutionVersion {
  id: UUID
  solutionId: UUID
  number: string
  name?: string
  status: SolutionStatus
  basedOnVersionId?: UUID
  discovery: DiscoveryDocument
  requirements: Requirement[]
  metadata: MetadataModel
  experience: ExperienceModel
  security: SecurityModel
  decisions: Decision[]
  healthRuleOverrides: HealthRuleOverride[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface DiscoveryDocument {
  format: 'html' | 'json-rich-text'
  content: string | Record<string, unknown>
  assetIds: UUID[]
}

export interface MetadataModel {
  objects: SalesforceObject[]
  fields: SalesforceField[]
  relationships: ObjectRelationship[]
  globalValueSets: GlobalValueSet[]
  customLabels: CustomLabel[]
  recordTypes: RecordTypeDefinition[]
  validationRules: ValidationRuleDefinition[]
}

export interface SalesforceObject {
  id: UUID
  origin: ArtifactOrigin
  label: string
  pluralLabel?: string
  apiName?: string
  kind: ObjectKind
  description?: string
  recordName?: RecordNameDefinition
  allowReports?: boolean
  allowActivities?: boolean
  deploymentStatus?: 'in-development' | 'deployed'
  governance: GovernanceMetadata
}

export interface SalesforceField {
  id: UUID
  objectId: UUID
  origin: ArtifactOrigin
  label: string
  apiName?: string
  dataType: FieldDataType
  description?: string
  helpText?: string
  required: boolean
  unique?: boolean
  externalId?: boolean
  defaultValue?: string | number | boolean | null
  length?: number
  precision?: number
  scale?: number
  formula?: string
  referenceToObjectId?: UUID
  localPicklistValues?: PicklistValue[]
  globalValueSetId?: UUID
  picklistDependency?: PicklistDependency
  governance: GovernanceMetadata
}

export interface PicklistDependency {
  controllingFieldId: UUID
  mappings: PicklistDependencyMapping[]
}

export interface PicklistDependencyMapping {
  controllingValue: string
  dependentValues: string[]
}

export interface ObjectRelationship {
  id: UUID
  fieldId: UUID
  parentObjectId: UUID
  childObjectId: UUID
  type: 'lookup' | 'master-detail' | 'external-lookup' | 'indirect-lookup'
  relationshipName?: string
  description?: string
}

export interface GlobalValueSet {
  id: UUID
  label: string
  apiName?: string
  description?: string
  sorted: boolean
  values: PicklistValue[]
  governance: GovernanceMetadata
}

export interface PicklistValue {
  id: UUID
  label: string
  apiValue: string
  active: boolean
  default: boolean
  description?: string
}

export interface CustomLabel {
  id: UUID
  name: string
  value: string
  language: string
  protected: boolean
  shortDescription?: string
}

export interface RecordTypeDefinition {
  id: UUID
  objectId: UUID
  label: string
  apiName?: string
  active: boolean
  description?: string
}

export interface ValidationRuleDefinition {
  id: UUID
  objectId: UUID
  name: string
  active: boolean
  formula: string
  errorMessage: string
  errorLocation: 'top-of-page' | 'field'
  fieldId?: UUID
  description?: string
}

export interface ExperienceModel {
  layouts: LayoutDefinition[]
}
export interface LayoutDefinition {
  id: UUID
  objectId: UUID
  name: string
  kind: 'page-layout' | 'record-page'
  sections: LayoutSection[]
}
export interface LayoutSection {
  id: UUID
  label: string
  layout: 'one-column' | 'two-column' | 'two-thirds-one-third'
  collapsible: boolean
  items: LayoutItem[]
}
export interface LayoutItem {
  id: UUID
  type: 'field' | 'related-list' | 'rich-text' | 'flow' | 'lwc' | 'blank-space'
  artifactId?: UUID
  column: number
  order: number
  behavior: 'edit' | 'read-only' | 'required'
  visibilityRule?: VisibilityRule
}
export interface VisibilityRule {
  logic: 'all' | 'any' | 'custom'
  expression?: string
  conditions: VisibilityCondition[]
}
export interface VisibilityCondition {
  fieldId: UUID
  operator: 'equals' | 'not-equals' | 'contains' | 'is-null' | 'is-not-null'
  value?: string | number | boolean
}

export interface SecurityModel {
  profiles: SecurityPrincipal[]
  permissionSets: SecurityPrincipal[]
  permissionSetGroups: PermissionSetGroup[]
  fieldAccess: FieldAccessAssignment[]
}
export interface SecurityPrincipal {
  id: UUID
  name: string
  description?: string
}
export interface PermissionSetGroup extends SecurityPrincipal {
  permissionSetIds: UUID[]
  mutedPermissionSetIds: UUID[]
}
export interface FieldAccessAssignment {
  id: UUID
  principalType: 'profile' | 'permission-set'
  principalId: UUID
  fieldId: UUID
  readable: boolean
  editable: boolean
}

export interface Requirement {
  id: UUID
  title: string
  description?: string
  status: 'draft' | 'approved' | 'implemented' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  acceptanceCriteria: string[]
  linkedArtifactIds: UUID[]
}

export interface Decision {
  id: UUID
  title: string
  decision: string
  rationale?: string
  alternatives?: string[]
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded'
  linkedArtifactIds: UUID[]
  decidedAt?: ISODateTime
}

export interface GovernanceMetadata {
  businessOwner?: string
  technicalOwner?: string
  businessPurpose?: string
  notes?: string
  tags: string[]
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface HealthRule {
  id: UUID
  name: string
  appliesTo: 'project' | 'solution' | 'object' | 'field' | 'layout' | 'security'
  severity: 'info' | 'warning' | 'error'
  enabled: boolean
  ruleType: string
  configuration: Record<string, unknown>
  message: string
}
export interface HealthRuleOverride {
  ruleId: UUID
  enabled?: boolean
  severity?: HealthRule['severity']
}
export interface RecordNameDefinition {
  label: string
  dataType: 'text' | 'auto-number'
  displayFormat?: string
}
export interface ArtifactOrigin {
  type: 'created' | 'imported' | 'ai-generated'
  sourceId?: string
  importedAt?: ISODateTime
}
export interface TemplateDefinition {
  id: UUID
  name: string
  type: string
  payload: Record<string, unknown>
}
export interface AuditInfo {
  createdAt: ISODateTime
  updatedAt: ISODateTime
  createdBy?: string
  updatedBy?: string
}
