cmake_minimum_required(VERSION 3.15)

project(vendor VERSION 1.0.0.0)

# (must be top-level project to run tests and packing, like any other CMake project!)
set (vendor_IS_MASTER_PROJECT FALSE)
if(NOT (PROJECT_SOURCE_DIR STREQUAL PROJECT_BINARY_DIR))
  set (vendor_IS_MASTER_PROJECT TRUE)
endif()

include(CMakeJS)

cmakejs_create_napi_addon (
  # CMAKEJS_ADDON_NAME
  addon
  # SOURCES
  src/hello/addon.cpp
  # NAPI_CPP_CUSTOM_NAMESPACE
  NAMESPACE vendor
)

# If this is not a subproject...
if (vendor_IS_TOP_LEVEL
  # (and we're not building into the source tree)
  AND vendor_IS_MASTER_PROJECT
)

  include(GNUInstallDirs) # dont be alarmed by this - it wont install to your system!

  # CPack prep stuff...
  export (
    TARGETS addon
    FILE share/cmake/AddonTargets.cmake
    NAMESPACE vendor::
  )

  install(
    EXPORT AddonTargets
    FILE addonTargets.cmake
    NAMESPACE vendor::
    DESTINATION lib/cmake/vendor
  )

  install(TARGETS addon
    EXPORT AddonTargets
    LIBRARY DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    ARCHIVE DESTINATION  "${CMAKE_INSTALL_LIBDIR}"
    RUNTIME DESTINATION  "${CMAKE_INSTALL_BINDIR}"
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
  )


  file (WRITE "${CMAKE_CURRENT_BINARY_DIR}/AddonConfig.cmake.in" [==[
  @PACKAGE_INIT@

  include (${CMAKE_CURRENT_LIST_DIR}/AddonTargets.cmake)

  check_required_components (vendor)

  ]==])

  # create cmake config file
  configure_package_config_file (
      "${CMAKE_CURRENT_BINARY_DIR}/AddonConfig.cmake.in"
      "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/AddonConfig.cmake"
    INSTALL_DESTINATION
      "${CMAKE_INSTALL_LIBDIR}/cmake/Addon"
  )
  # generate the version file for the cmake config file
  write_basic_package_version_file (
    "${CMAKE_CURRENT_BINARY_DIR}/share/cmake/AddonConfigVersion.cmake"
    VERSION 1.0.0
    COMPATIBILITY AnyNewerVersion
  )

  # copy the addon types
  file(COPY
    "${CMAKE_CURRENT_LIST_DIR}/lib/addon.node.js"
    "${CMAKE_CURRENT_LIST_DIR}/lib/addon.node.ts"
    "${CMAKE_CURRENT_LIST_DIR}/lib/addon.node.d.ts"
    DESTINATION
    "${PROJECT_BINARY_DIR}/lib"
  )

  install(FILES
    "${PROJECT_BINARY_DIR}/lib/addon.node.js"
    "${PROJECT_BINARY_DIR}/lib/addon.node.ts"
    "${PROJECT_BINARY_DIR}/lib/addon.node.d.ts"
    DESTINATION
    "${CMAKE_INSTALL_LIBDIR}"
  )

  if(BUILD_TESTS)
      # include(CTest) # If you want to see all the test dashboard targets, uncomment this
      enable_testing()
      include("${CMAKE_CURRENT_LIST_DIR}/tests/hello/tests.cmake")
  endif()

  # set(CPACK_PACKAGE_CHECKSUM "${PROJECT_VERSION_TWEAK}") # git rev-parse is a good idea for this...
  set(CPACK_PACKAGE_VENDOR "vendor")
  set(CPACK_PACKAGE_NAME              "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}-node_${NODE_VERSION}")
  set(CPACK_PACKAGE_FILE_NAME         "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR}-node_${NODE_VERSION}") # Multi-platform CMake API distribution
  set(CPACK_SOURCE_PACKAGE_FILE_NAME  "${PROJECT_NAME}-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-Source") # No system spec as this is un-compiled source file distribution (i.e., the Javascript API)
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY ${PROJECT_DESCRIPTION})
  set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
  set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_VERSION_MINOR})
  set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_VERSION_PATCH})
  set(CPACK_PACKAGE_VERSION_TWEAK ${PROJECT_VERSION_VERSION_TWEAK})
  #set(CPACK_RESOURCE_FILE_LICENSE ${PROJECT_SOURCE_DIR}/LICENSE)
  set(CPACK_RESOURCE_FILE_README  ${PROJECT_SOURCE_DIR}/README.md)
  set(CPACK_INCLUDE_TOPLEVEL_DIRECTORY ON)
  set(CPACK_COMPONENT_INCLUDE_TOPLEVEL_DIRECTORY ON)
  set(CPACK_SOURCE_GENERATOR "TGZ;ZIP") # Check out CPack's 'NSIS' installer for Win32, and the others!
  set(CPACK_SOURCE_IGNORE_FILES
      _CPack_Packages
      /*.zip
      /*.tar
      /*.tar.*
      /.env*
      /.git/*
      /.cmake
      /.github
      /.vs
      /.vscode
      /.cache
      /.config
      /.local
      /dist
      /doc
      /docs
      #/bin
      #/lib
      /usr
      /out
      #/build
      /Release
      /Debug
      /MinSizeRel
      /RelWithDebInfo
      /downloads
      /installed
      /install
      /node_modules
      /vcpkg
      /.*build.*
      /package-lock.json
      /yarn.lock
      /\\\\.DS_Store
  )
  include(CPack)

endif () # *_IS_TOP_LEVEL_PROJECT
