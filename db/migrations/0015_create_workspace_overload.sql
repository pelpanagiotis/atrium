-- 0002 added p_icon as a new overload instead of replacing the 0001 function,
-- so a three-argument call matched both and failed as "not unique".
DROP FUNCTION IF EXISTS create_workspace(text, text, text);

REVOKE ALL ON FUNCTION create_workspace(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_workspace(text, text, text, text) TO atrium_app;
