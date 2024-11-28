import { ArraySubject, DisplayComponent, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './MfdAtccomConnect.scss';
import { AbstractMfdPageProps } from 'instruments/src/MFD/MFD';
import { Footer } from 'instruments/src/MFD/pages/common/Footer';

import { Button } from 'instruments/src/MFD/pages/common/Button';
// import { FmsPage } from 'instruments/src/MFD/pages/common/FmsPage';
import { ActivePageTitleBar } from 'instruments/src/MFD/pages/common/ActivePageTitleBar';

import { DropdownMenu } from 'instruments/src/MFD/pages/common/DropdownMenu';
import { AdscButton } from 'instruments/src/MFD/pages/common/AdscButton';

render(): VNode {
    return (
        <div>
            <DropdownMenu ref={this.dropdownMenuRef}>VERTICAL</DropdownMenu>
            <DropdownMenu ref={this.dropdownMenuRef}>LATERAL</DropdownMenu>
            <DropdownMenu ref={this.dropdownMenuRef}>SPEED</DropdownMenu>
            <DropdownMenu ref={this.dropdownMenuRef}>CLEARANCE</DropdownMenu>
            <DropdownMenu ref={this.dropdownMenuRef}>WhEN CAN WE EXPECT</DropdownMenu>
            <DropdownMenu ref={this.dropdownMenuRef}>OTHER</DropdownMenu>
        </div>
    )
