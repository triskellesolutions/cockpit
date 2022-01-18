/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2020 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from 'cockpit';
import React from 'react';
import { Checkbox } from '@patternfly/react-core';

import { show_modal_dialog } from "cockpit-components-dialog.jsx";

const _ = cockpit.gettext;

function DeleteAccountDialogBody({ state, change }) {
    const { delete_files } = state;

    return (
        <Checkbox id="account-confirm-delete-files"
                  label={_("Delete files")}
                  isChecked={delete_files} onChange={checked => change("delete_files", checked)} />
    );
}

export function delete_account_dialog(account) {
    let dlg = null;

    const state = {
        delete_files: false
    };

    function change(field, value) {
        state[field] = value;
        update();
    }

    function update() {
        const props = {
            id: "account-confirm-delete-dialog",
            title: cockpit.format(_("Delete $0"), account.name),
            body: <DeleteAccountDialogBody state={state} change={change} />
        };

        const footer = {
            actions: [
                {
                    caption: _("Delete"),
                    style: "danger",
                    clicked: () => {
                        const prog = ["/usr/local/bin/unmount-user-sftp-path.sh", account.name];

                        return cockpit.spawn(prog, { superuser: "require", err: "message" })
                                .then((data, message) => {
                                    console.log({ "data": data, "message": message });
                                    return tss_delete_user(account.name, state.delete_files);
                                }).then(function () {
                                    cockpit.location.go("/");
                                });
                    }
                }
            ]
        };

        if (!dlg)
            dlg = show_modal_dialog(props, footer);
        else {
            dlg.setProps(props);
            dlg.setFooterProps(footer);
        }
    }

    // begin tss_config_sftp_user
    function tss_delete_user(name, delete_files) {
        return new Promise((resolve, reject) => {
            const prog = ["/usr/sbin/userdel"];
            if (delete_files) {
                prog.push("-r");
            }
            prog.push(name);

            cockpit.spawn(prog, { superuser: "require", err: "message" })
                    .done(function() {
                        resolve();
                    })
                    .fail(function(ex, response) {
                        if (ex.exit_status) {
                            console.log(ex);
                            if (response)
                                ex = new Error(response);
                            else
                                ex = new Error(_("Failed to run /usr/sbin/userdel"));
                        }
                        reject(ex);
                    });
        });
    }
    // end tss_config_sftp_user

    update();
}
