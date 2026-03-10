/**
 * Maps a wedding_members role to permission booleans.
 * Roles: 'owner', 'planner', 'couple', 'family', 'vendor', 'viewer'
 */
export default function usePermissions(myRole) {
  const role = (myRole || 'viewer').toLowerCase()

  const isOwner   = role === 'owner'
  const isPlanner = role === 'planner'
  const isCouple  = role === 'couple'
  const isFamily  = role === 'family'
  const isVendor  = role === 'vendor'
  const isViewer  = role === 'viewer'

  const canEdit = isOwner || isPlanner

  return {
    isOwner,
    isPlanner,
    isCouple,
    isFamily,
    isVendor,
    isViewer,

    canEdit,
    canMessage: true,
    canEditGuests: canEdit,
    canEditTasks: canEdit,
    canEditVendors: canEdit,
    canEditBilling: canEdit,
    canEditSeating: canEdit,
    canEditNotes: canEdit,
    canInvite: canEdit,
    canDeleteWedding: isOwner,
    canSeePrivateNotes: canEdit,
    canCreateChannel: canEdit,

    canViewAllGuests: !isVendor,
    canViewAllVendors: !isVendor,
    canViewBilling: canEdit,
    canViewCollaborators: canEdit,
    canViewDayOf: !isVendor,
    canViewNotes: !isVendor,
    canEditGuidance: canEdit,
    canViewGuidance: !isVendor,
  }
}
