Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir

nodePath = ""
candidates = Array( _
  fso.BuildPath(appDir, "runtime\node.exe"), _
  fso.BuildPath(appDir, "node\node.exe"), _
  fso.BuildPath(appDir, "nodejs\node.exe") _
)

For Each candidate In candidates
  If fso.FileExists(candidate) Then
    nodePath = candidate
    Exit For
  End If
Next

If nodePath = "" Then
  nodePath = "node"
End If

shell.Run """" & nodePath & """ """ & fso.BuildPath(appDir, "server.js") & """", 0, False
